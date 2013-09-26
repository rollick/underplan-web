Template.permaShorty.activity = function () {
  return Activities.findOne(Session.get("activityId"));
};

///////////////////////////////////////////////////////////////////////////////
// Short Form

var clearHiddenLocationFields = function(template) {
  template.find("#lat").value = "";
  template.find("#lng").value = "";
  template.find("#city").value = "";
  template.find("#country").value = "";
  template.find("#region").value = "";
  
  template.find(".location-coords").innerHTML = "";
};

var clearForm = function(template) {
  clearHiddenLocationFields(template);
  template.find("#text").value = "";
  template.find("#location").value = "";
  template.find("#picasa-tags").value = "";
  template.find(".location-coords").innerHTML = "";
};

Template.shortForm.events({
  'click .show-advanced-location': function (event, template) {
    var fields = template.find(".location-fields");
    $(fields).toggle();

    return false;
  },
  'click .cancel': function (event, template) {
    clearForm(template);
    $(template.find("form")).removeClass("expanded");

    return false;
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
  'click .post': function (event, template) {
    if($(template.find("a")).hasClass("disabled"))
      return false;

    var values = {};
    values.text       = template.find("#text").value;
    values.lat        = template.find("#lat").value;
    values.lng        = template.find("#lng").value;
    values.city       = template.find("#city").value;
    values.country    = template.find("#country").value;
    values.region     = template.find("#region").value;
    values.picasaTags = template.find("#picasa-tags").value;
    values.groupId    = getCurrentGroupId();

    if (values.groupId && values.text.length) {
      Meteor.call('createActivity', values, function (error, activityId) {
        if (error) {
          Session.set("createError", error);
        } else {
          $(template.find("form")).removeClass("expanded");

          template.find("#text").value = 
          template.find("#picasa-tags").value =
          template.find("#lat").value = 
          template.find("#lng").value = 
          template.find("#location").value =
          template.find("#city").value =
          template.find("#country").value =
          template.find("#region").value = "";

          template.find(".text-length").innerHTML = shortMaxLength;
        }
      });
    } else {
      Session.set("createError",
                  "It needs to have text");
    }
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Short Content

Template.shortContent.events({
  'click .remove': function (event, template) {
    $(template.firstNode).closest(".activity").addClass("disabled");

    Meteor.call('removeActivity', this._id, function (error) {
      if (error) {
        Session.set("createError", [error.error, error.reason].join(": "));
      }
    });

    return false;
  },
  'mouseenter': function (event, template) {
    $(template.find(".actions")).show();
  },
  'mouseleave': function (event, template) {
    $(template.find(".actions")).hide();
  },
});

Template.shortContent.helpers({
  photo: function () {
    // if activity already has photo
    if (this.photo) {
      appendShortPhoto(this);
      return;
    }

    var group = Groups.findOne(Session.get("groupId"));
    if (this.picasaTags && _.isObject(group.trovebox)) {
      var params = $.extend({tags: this.picasaTags, max: 1}, group.trovebox),
          search = new Galleria.Trovebox,
          self = this;

      search.albumSearch(params, function(data, params) { 
        if (data.length) {
          // get the id for the feed item associated with this photo tag
          // and insert the img into the item
          var activity = Activities.findOne(self._id);

          activity.photo = data[0].image;
          appendShortPhoto(activity);
        }
      });
    }
  }
});

var appendShortPhoto = function (activity) {
  var html = "";

  html += "<div class=\"photo\" style=\"background-image: url(" + activity.photo + ")\">";
  html +=   "<img src='" + activity.photo + "'/>";
  html += "</div>";
  
  var existingPhoto = $("#" + activity._id + " .activity .photo");
  if (!existingPhoto.length) {
    $("#" + activity._id + " .activity").append(html);
  }
}

Template.shortContent.canRemove = function () {
  return canUserRemoveActivity(Meteor.userId(), this._id);
};

Template.shortContent.basicLocation = function () {
  var location = "";
  if (_.isString(this.country) && this.country.length) {
    if (Session.get("feedFilter").country) {
      location = this.city;
    } else {
      location = [this.city, this.country].join(", ");
    }
  }

  if (location.length) {
    return "- " + location;
  } else {
    return "";
  }
}
