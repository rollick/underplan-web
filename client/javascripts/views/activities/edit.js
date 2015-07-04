///////////////////////////////////////////////////////////////////////////////
// Activity editor

Template.storyEditor.helpers({
  activity: function () {
    return Activities.findOne(ReactiveGroupFilter.get("activity")) || {};
  },
  defaultMapZoom: function () {
    return App.Defaults.defaultMapZoom;
  },
  createdOrToday: function () {
    var date = this.created || new Date();

    return App.Utils.simpleDate(date);
  },
  publishedCls: function () {
    return this.published ? "checked" : "";
  },
  error: function () {
    return Session.get("displayError");
  }
});

Template.storyEditor.events({
  'click .show-advanced-location': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var fields = template.find(".location-fields");
    $(fields).toggle();
  },
  'keyup #wikipedia-search': function (event, template) {
    var searchElem = $(template.find("#wikipedia-search"))
    var search = searchElem.val();

    if (search.length === 0) {
      template.find("#wikipedia-id").value = "";
      template.find("#wikipedia-url").innerHTML = "";

      return true;
    }
  },
  'click .cancel': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    Router.setGroup(Groups.findOne(ReactiveGroupFilter.get("group")));
  },
  'click .back': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    Router.setActivity(this);
  },
  'click .save': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    // check if button is disabled => save already triggered
    var btns = $(template.find(".save.button, .cancel.button"));
    if(btns.hasClass("disabled")) {
      return false;
    } else {
      btns.addClass("disabled");
    }

    var values = getStoryValues(template);
    Meteor.call('createActivity', values, function (error, activityId) {
      if (error) {
        Session.set("displayError", error.reason);
      } else {
        Router.setActivity(activityId);
      }
    });

    btns.removeClass("disabled");
    $(document).scrollTop(0);
  },
  'click .update': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var notify = template.find("#notify").checked,
        activityId = template.find("#_id").value,
        values = getStoryValues(template);

    Meteor.call('updateActivity', {notify: notify, activityId: activityId, values: values}, function (error) {
      if (error) {
        Session.set("displayError", error.reason);
      } else {
        Router.setActivity(Activities.findOne(activityId));
      }
    });
    $(document).scrollTop(0);
  },
});

// Template.storyEditor.publishedDatePicker = function() {
//   return Template.datePicker.withData(data);
// };

var getStoryValues = function(template) {
  values = {type: "story"};
  values.groupId = ReactiveGroupFilter.get("group");

  // If the form has a different groupId to the session
  // then use that instead -> user is trying to 'move'
  // the activity to a new group.
  var groupElem = template.find("#groupId");
  if (groupElem && !_.isEmpty(groupElem.value) && groupElem.value != values.groupId) {
    values.groupId = groupElem.value;
  }

  // Latitude and Longitude
  var lat = template.find("#lat").value;
  var lng = template.find("#lng").value;

  if(lat != "" && lng != "") {
    values.lat = lat;
    values.lng = lng;
    values.city = template.find("#city").value;
    values.region = template.find("#region").value;
    values.country = template.find("#country").value;
  } else {
    values.lat = values.lng = null;
  }

  // Created (Publish) Date
  var day = template.find(".day-picker option:selected").value;
  var month = template.find(".month-picker option:selected").value;
  var year = template.find(".year-picker option:selected").value;
  
  // Months are zero based when using 'new Date'
  var created = new Date(year, parseInt(month) - 1, day);
  if(created.toLocaleString() != "Invalid Date")
    values.created = created; 

  // Other values
  values.title =            template.find("#title").value;
  values.text =             template.find("#text").value;
  values.location =         template.find(".location-search").value;
  values.published =        template.find("#published").checked;
  values.slug =             template.find("#slug").value;
  values.picasaTags =       template.find("#picasa-tags").value;
  values.mapZoom =          template.find("#map-zoom").value;
  values.wikipediaSearch =  template.find("#wikipedia-search").value;
  values.wikipediaId =      template.find("#wikipedia-id").value;

  return values;
}

Template.storyEditor.rendered = function () { 
  var domain = "http://www.dbpedialite.org";

  $("#wikipedia-search").autocomplete({
    source: domain + "/search.json",
    select: function(event, ui) {
      // do a jsonp request to work around cross-site scripting issue
      $.ajax({
        url: "https://en.wikipedia.org/w/api.php",
        data: {action: "query", format: "json", titles: ui["item"]["label"]},
        type: "get",
        dataType : "jsonp",
        success: function( data, response ) {
          var pageIds = Object.keys(data.query.pages);

          if (_.isArray(pageIds) && pageIds.length) {
            $("#wikipedia-id").val(pageIds[0]);

            var pageUrl = "https://en.wikipedia.org/wiki?curid=" + pageIds[0];
            var link = $("<a />").attr("href", pageUrl).
                                  attr("target", "_blank").
                                  html(pageUrl);

            $("#wikipedia-url").html(link);
          }
        }
      });
    }
  });
}