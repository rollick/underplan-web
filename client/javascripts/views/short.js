///////////////////////////////////////////////////////////////////////////////
// Shorty Editor

Template.shortyEditor.activity = function () {
  return Activities.findOne(ReactiveGroupFilter.get("activity"));
};

///////////////////////////////////////////////////////////////////////////////
// Short Form

var clearHiddenLocationFields = function (template) {
  template.find("#lat").value = "";
  template.find("#lng").value = "";
  template.find("#city").value = "";
  template.find("#country").value = "";
  template.find("#region").value = "";
  
  template.find(".location-coords").innerHTML = "";
};

var clearForm = function (template) {
  clearHiddenLocationFields(template);
  template.find("#text").value = "";
  template.find("#location").value = "";
  template.find("#picasa-tags").value = "";
  template.find(".location-coords").innerHTML = "";
};

var getValues = function (template) {
  return {
    text:       template.find("#text").value,
    location:   template.find("#location").value,
    lat:        template.find("#lat").value,
    lng:        template.find("#lng").value,
    city:       template.find("#city").value,
    country:    template.find("#country").value,
    region:     template.find("#region").value,
    picasaTags: template.find("#picasa-tags").value,
    groupId:    ReactiveGroupFilter.get("group")
  };
}

Template.shortForm.helpers({
  formCls: function () {
    return this._id ? "expanded" : "";
  }
});

Template.shortForm.activity = function () {
  var activityId = ReactiveGroupFilter.get("activity");
  if (activityId) {
    return Activities.findOne(activityId);
  } else {
    return {};
  }
};

Template.shortForm.events({
  'click .show-advanced-location': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var fields = template.find(".location-fields");
    $(fields).toggle();
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
    var textElem = template.find("#text");
    var countElem = template.find(".text-length");
    var submit = template.find(".post");

    if(textElem.value.length === 0 || textElem.value.length > shortMaxLength) {
      $(submit).addClass("disabled");
    } else {
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
  'keydown #location': function (event, template) {
    if(event.which === 13)
      event.preventDefault();
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
          template.find("#city").value = geo.city;
          template.find("#country").value = geo.country;
          template.find("#region").value = geo.region;

          template.find(".location-coords").innerHTML = Math.round(geo.lat*10000)/10000 + ", " + Math.round(geo.lng*10000)/10000 + " (" + geo.address + ")";
        } else {
          clearHiddenLocationFields(template);

          template.find(".location-coords").innerHTML = (location == "" ? "" : "Geolocation failed!");      
        }
      });
    }

    return false;
  },
  'click .update': function (event, template) {
    event.stopPropagation();
    event.preventDefault();
debugger
    if($(template.find("a")).hasClass("disabled"))
      return false;

    var activityId = template.find("#_id").value;
    var values = getValues(template);

    if (values.groupId && values.text.length) {
      Meteor.call('updateActivity', {notify: false, activityId: activityId, values: values}, function (error) {
        if (error) {
          Session.set("createError", error.reason);
        } else {
          clearForm(template);
          Router.setPermaActivity(activityId);
        }
      });
    } else {
      Session.set("createError",
                  "It needs to have text");
    }
  },
  'click .post': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    if($(template.find("a")).hasClass("disabled"))
      return false;

    var values = getValues(template);

    if (values.groupId && values.text.length) {
      Meteor.call('createActivity', values, function (error, activityId) {
        if (error) {
          Session.set("createError", error.reason);
        } else {
          clearForm(template);

          $(template.find("form")).removeClass("expanded");
        }
      });
    } else {
      Session.set("createError",
                  "It needs to have text");
    }
  }
});
