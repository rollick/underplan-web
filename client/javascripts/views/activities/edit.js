///////////////////////////////////////////////////////////////////////////////
// Activity editor

Template.storyEditor.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.storyEditor.defaultMapZoom = function () {
  return defaultMapZoom;
};

Template.storyEditor.events({
  'keydown #location': function (event, template) {
    if(event.which === 13)
      event.preventDefault();
  },
  'keyup #location': function (event, template) {
    var locationElem = $(template.find("#location"))
    var location = locationElem.val();

    if (event.keyCode === 13) {
      google.maps.event.trigger(autocomplete, 'place_changed');
      return false;
    }
    
    // debugger
    if(event.keyCode === 40 || event.keyCode === 38)
      return false;
    
    // only intitialise new geo autocomplete if one doesn't
    // already exist for this input
    if(! locationElem.attr("autocomplete")) {
      console.log("Geolocating: " + location);
      coords = geoLocation(location, "location", function(geo) {
        if(typeof geo === "object") {
          template.find("#lat").value = geo.lat;
          template.find("#lng").value = geo.lng;
          template.find("#city").value = geo.city;
          template.find("#region").value = geo.region;
          template.find("#country").value = geo.country;

          template.find("#location-coords").innerHTML = Math.round(geo.lat*10000)/10000 + ", " + Math.round(geo.lng*10000)/10000 + " (" + geo.address + ")";
        } else {
          template.find("#lat").value = 
          template.find("#lng").value = 
          template.find("#city").value = 
          template.find("#region").value = 
          template.find("#country").value = "";

          template.find("#location-coords").innerHTML = (location == "" ? "" : "Geolocation failed!");      
        }
      });
    }

    return false;
  },
  'click .cancel': function (event, template) {
    Router.setGroup(getCurrentGroup());
    return false;
  },
  'click .back': function (event, template) {
    Router.setActivity(this);
    return false;
  },
  'click .save': function (event, template) {
    var btns = $(template.find(".save.button, .cancel.button"));
    if(btns.hasClass("disabled")) {
      return false;
    } else {
      btns.addClass("disabled");
    }

    var values = getStoryValues(template);
    if (values.groupId && values.title.length && values.text.length) {
      Meteor.call('createActivity', values, function (error, activityId) {
        if (error) {
          Session.set("createError", error);
        } else {
          Router.setActivity(activityId);
        }
      });
    } else {
      Session.set("createError",
                  "It needs a title and a story");
    }
    btns.removeClass("disabled");
    $(document).scrollTop(0);

    return false;
  },
  'click .update': function (event, template) {
    var activityId = template.find("#_id").value;
    var values = getStoryValues(template);

    if (values.title.length && values.text.length) {
      Activities.update(activityId, {$set: values}, false, function (error) {
        if (error) {
          Session.set("createError", error);
        } else {
          // FIXME: the notify call should be server side.
          Meteor.call('notifyActivityUpdated', activityId);

          Router.setActivity(Activities.findOne(activityId));
        }
      });
    } else {
      Session.set("createError",
                  "It needs a title and a story");
    }
    $(document).scrollTop(0);

    return false;
  },
});

var getStoryValues = function(template) {
  values = {};

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

  values.title =        template.find("#title").value;
  values.text =         template.find("#text").value;
  values.location =     template.find("#location").value;
  values.published =    template.find("#published").checked;
  values.slug =         template.find("#slug").value;
  values.picasaTags =   template.find("#picasa-tags").value;
  values.mapZoom =      template.find("#map-zoom").value;
  values.groupId =      getCurrentGroupId();

  return values;
}

Template.storyEditor.error = function () {
  return Session.get("createError");
};