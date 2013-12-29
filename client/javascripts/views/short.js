///////////////////////////////////////////////////////////////////////////////
// Shorty Editor

Template.shortyEditor.activity = function () {
  return Activities.findOne(ReactiveGroupFilter.get("activity")) || {};
};

Template.shortyEditor.error = function () {
  return Session.get("displayError");
};

///////////////////////////////////////////////////////////////////////////////
// Short Form

var clearForm = function (template) {
  clearHiddenLocationFields(template);
  
  var inputs = template.find("input"),
      coords = template.find(".location-coords");
  if (inputs && inputs.length > 0)
    inputs.value = "";
  if (coords)
    coords.innerHTML = "";
};

var getValues = function (template) {
  return {
    text:       template.find("#text").value,
    location:   template.find(".location-search").value,
    lat:        template.find("#lat").value,
    lng:        template.find("#lng").value,
    city:       template.find("#city").value,
    country:    template.find("#country").value,
    region:     template.find("#region").value,
    picasaTags: template.find("#picasa-tags").value,
    groupId:    ReactiveGroupFilter.get("group")
  };
}

// TODO: remove this when meteor 0.7 released
// Use jquery to insert text value. Current version of meteor 0.7 is
// adding a script tag when using {{text}} in the template
Template.shortForm.rendered = function () {
  var activity = Activities.findOne(ReactiveGroupFilter.get("activity"));
  if (activity) {
    $(this.find("#text")).html(activity.text);
  }
};

Template.shortForm.helpers({
  group: function () {
    if (this.group)
      return Groups.findOne(this.group);
    else
      return {};
  },
  formCls: function () {
    return this._id ? "expanded" : "";
  }
});

Template.shortForm.events({
  'click .new-short': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    $(".short-form.row").show().find("textarea").focus();
  },
  "click .new-story": function () {
    event.stopPropagation();
    event.preventDefault();

    Router.setNewActivity(Groups.findOne(ReactiveGroupFilter.get("group")));
  },
  'click .cancel': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var element = template.find("#_id");
    if (element) {
      Router.setPermaActivity(element.value);
    } else {
      clearForm(template);
      $(template.find("form")).removeClass("expanded");
    }
  },
  'focus #text': function (event, template) {
    $(template.find("form")).addClass("expanded");
  },
  'keyup #text': function (event, template) {
    var textElem = template.find("#text"),
        countElem = template.find(".text-length"),
        submit = template.find(".post, .update");

    if(textElem.value.length === 0 || textElem.value.length > shortMaxLength) {
      $(submit).addClass("disabled");
      Session.set("displayError", "Text length too long");
    } else {
      Session.set("displayError", null);
      $(submit).removeClass("disabled");
    }

    var count = shortMaxLength - textElem.value.length;
    countElem.innerHTML = count;
    if(count <= 10) {
      countElem.style.color = "red";
    } else {
      countElem.style.color = "";
    }
  },
  'click .update': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    if($(template.find(".save, .update")).hasClass("disabled")) {
      return;
    }

    var activityId = template.find("#_id").value;
    var values = getValues(template);

    if (values.groupId && values.text.length) {
      Meteor.call('updateActivity', {notify: false, activityId: activityId, values: values}, function (error) {
        if (error) {
          Session.set("displayError", error.reason);
        } else {
          clearForm(template);
          Router.setPermaActivity(activityId);
        }
      });
    } else {
      Session.set("displayError",
                  "It needs to have text");
    }
  },
  'click .post': function (event, template) {
    event.stopPropagation();
    event.preventDefault();


    if($(template.find("a")).hasClass("disabled"))
      return false;

    var values = getValues(template);
    values.type = "short";

    if (values.groupId && values.text.length) {
      Meteor.call('createActivity', values, function (error, activityId) {
        if (error) {
          Session.set("displayError", error.reason);
        } else {
          clearForm(template);

          $(template.find("form")).removeClass("expanded");
        }
      });
    } else {
      Session.set("displayError",
                  "It needs to have text");
    }
  }
});
