///////////////////////////////////////////////////////////////////////////////
// Activity editor

var clearHiddenLocationFields = function(template) {
  template.find("#lat").value = "";
  template.find("#lng").value = "";
  template.find("#city").value = "";
  template.find("#country").value = "";
  template.find("#region").value = "";

  template.find("#location-coords").innerHTML = "";
};

Template.storyEditor.helpers({
  activity: function () {
    return Activities.findOne(ReactiveGroupFilter.get("activity"));
  },
  defaultMapZoom: function () {
    return defaultMapZoom;
  },
  publishedCls: function () {
    return this.published ? "checked" : "";
  }
});

Template.storyEditor.events({
  'click .show-advanced-location': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var fields = template.find(".location-fields");
    $(fields).toggle();
  },
  'keydown #location': function (event, template) {
    if(event.which === 13)
      event.preventDefault();
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
  'keyup #location': function (event, template) {
    var locationElem = $(template.find("#location"))
    var location = locationElem.val();

    if (location.length === 0) {
      clearHiddenLocationFields(template);
      return false;
    }

    if (event.keyCode === 13) {
      google.maps.event.trigger(autocomplete, 'place_changed');
      return false;
    }
    
    if(event.keyCode === 40 || event.keyCode === 38)
      return false;
    
    // only intitialise new geo autocomplete if one doesn't
    // already exist for this input
    if(! locationElem.attr("autocomplete")) {
      coords = geoLocation(location, "location", function(geo) {
        if(typeof geo === "object") {
          template.find("#lat").value = geo.lat;
          template.find("#lng").value = geo.lng;
          template.find("#city").value = geo.city || "";
          template.find("#region").value = geo.region || "";
          template.find("#country").value = geo.country || "";

          template.find("#location-coords").innerHTML = Math.round(geo.lat*10000)/10000 + ", " + Math.round(geo.lng*10000)/10000 + " (" + geo.address + ")";
        } else {
          clearHiddenLocationFields(template);

          template.find("#location-coords").innerHTML = (location == "" ? "" : "Geolocation failed!");        
        }
      });
    }

    return false;
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

    var btns = $(template.find(".save.button, .cancel.button"));
    if(!btns.hasClass("disabled")) {
      return false;
    } else {
      btns.addClass("disabled");
    }

    var values = getStoryValues(template);
    // the 
    Meteor.call('createActivity', values, function (error, activityId) {
      if (error) {
        Session.set("createError", error.reason);
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

    var activityId = template.find("#_id").value;
    var notify = template.find("#notify").checked;
    var values = getStoryValues(template);

    Meteor.call('updateActivity', {notify: notify, activityId: activityId, values: values}, function (error) {
      if (error) {
        Session.set("createError", error.reason);
      } else {
        Router.setActivity(Activities.findOne(activityId));
      }
    });
    $(document).scrollTop(0);
  },
});

Template.storyEditor.publishedDatePicker = function() {
  var theDate = this.currentDate;
  if(typeof theDate != "object" || typeof theDate.getMonth != "function") {
    theDate = new Date();
  }

  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var month = months[theDate.getMonth()];
  var year = theDate.getFullYear();
  var day = theDate.getDate();
  var days = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];
  var years = [year-2, year-1, year, year+1, year+2];

  var data = {
    selectedYear: year,
    selectedMonth: month,
    selectedDay: day,
    years: years,
    months: months,
    days: days
  };

  return Template.datePicker.withData(data);
};

var getStoryValues = function(template) {
  values = {type: "story"};

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
  var day = template.find(".day-picker .current").text;
  var month = template.find(".month-picker .current").text;
  var year = template.find(".year-picker .current").text;
  var created = new Date(day + " " + month + " " + year);

  if(created.toLocaleString() != "Invalid Date")
    values.created = created; 
     
  // var createdStr = template.find(".created").value;
  // if(createdStr != "") {
  //   created = new Date(createdStr);
  //   if(created.toLocaleString() != "Invalid Date")
  //     values.created = created;
  // }

  values.title =            template.find("#title").value;
  values.text =             template.find("#text").value;
  values.location =         template.find("#location").value;
  values.published =        template.find("#published").checked;
  values.slug =             template.find("#slug").value;
  values.picasaTags =       template.find("#picasa-tags").value;
  values.mapZoom =          template.find("#map-zoom").value;
  values.wikipediaSearch =  template.find("#wikipedia-search").value;
  values.wikipediaId =      template.find("#wikipedia-id").value;
  values.groupId =          ReactiveGroupFilter.get("group");

  return values;
}

Template.storyEditor.error = function () {
  return Session.get("createError");
};

Template.storyEditor.rendered = function () { 
  // TODO: remove this when meteor 0.7 released
  // Use jquery to insert text value. Current version of meteor 0.7 is
  // adding a script tag when using {{text}} in the template
  var activity = Activities.findOne(ReactiveGroupFilter.get("activity"));
  if (activity) {
    $(this.find("#text")).html(activity.text);
  }

  var domain = "http://www.dbpedialite.org";

  $("#wikipedia-search").autocomplete({
    source: domain + "/search.json",
    select: function(event, ui) {
      // do a jsonp request to work around cross-site scripting issue
      $.ajax({
        url: "http://en.wikipedia.org/w/api.php",
        data: {action: "query", format: "json", titles: ui["item"]["label"]},
        type: "get",
        dataType : "jsonp",
        success: function( data, response ) {
          var pageIds = Object.keys(data.query.pages);

          if (_.isArray(pageIds) && pageIds.length) {
            $("#wikipedia-id").val(pageIds[0]);

            var pageUrl = "http://en.wikipedia.org/wiki?curid=" + pageIds[0];
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