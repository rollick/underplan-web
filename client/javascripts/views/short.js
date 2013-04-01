///////////////////////////////////////////////////////////////////////////////
// Short View

// Template.short.preserve([".short.entry.expanded"]);

Template.short.events({
  'click .short-actions a.comments': function (event, template) {
    $(template.firstNode).closest(".short").toggleClass("expanded");

    return false;
  },
  'click .short-actions .new-comment a': function (event, template) {
    $(template.firstNode).closest(".short").addClass("expanded");
    $("#" + this._id + " form").find("textarea").focus();

    return false;
  }
});

Template.short.lastCommented = function () {
  return Session.get("lastUpdatedActivityId") == this._id;
}

Template.short.hasComments = function () {
  return Comments.find({activityId: this._id}).count() > 0;
};

Template.short.countText = function () {
  var count = Comments.find({activityId: this._id}).count();
  var text = count;

  text += (count > 1 || count == 0) ? " comments" : " comment";

  return text;
};

Template.short.lastUpdated = function () {
  return this._id == Session.get("lastUpdatedActivity");
}

// override this method to specify a different short
Template.short.activity = function() {
  return this;
};

var toggleComments = function(template) {
  var link = template.find("a.comments");
  var actions = template.find(".short-comments");

  if(link.hasClass("open")) {
    $(actions).toggle();
    $(link).toggleClass("open");
  } else {}
}

///////////////////////////////////////////////////////////////////////////////
// Short Form

Template.shortForm.events({
  'click .cancel': function (event, template) {
    $(template.firstNode).closest(".short-form.row").hide();

    return false;
  },
  'keyup #text': function (event, template) {
    var max = shortMaxLength();
    var textElem = template.find("#text");
    var countElem = template.find(".text-length");
    var submit = template.find(".post");

    if(textElem.value.length > max) {
      $(submit).addClass("disabled");
    } else {
      $(submit).removeClass("disabled");
    }

    var count = max - textElem.value.length;
    countElem.innerHTML = count;
    if(count <= 10) {
      countElem.style.color = "red";
    } else {
      countElem.style.color = "";
    }
  },
  'keyup #location': function (event, template) {
    var location = template.find("#location").value;
    
    if(!(location.length > 3))
      return false;
    
    if (timeout) {  
      clearTimeout(timeout);
    }
    timeout = setTimeout(function() {
      console.log("Geolocating: " + location);

      coords = geoLocation(location, function(geo) {
        if(typeof geo === "object") {
          template.find("#lat").value = geo.lat;
          template.find("#lng").value = geo.lng;
          template.find("#city").value = geo.city;
          template.find("#country").value = geo.country;
          template.find("#region").value = geo.region;

          template.find(".location-coords").innerHTML = Math.round(geo.lat*10000)/10000 + ", " + Math.round(geo.lng*10000)/10000 + " (" + geo.address + ")";
        } else {
          template.find("#lat").value =
          template.find("#lng").value =
          template.find("#city").value =
          template.find("#country").value =
          template.find("#region").value = "";

          template.find(".location-coords").innerHTML = (location == "" ? "" : "Geolocation failed!");      
        }
      });
    }, 750);
  },
  'click .post': function (event, template) {
    if($(template.find("a")).hasClass("disabled"))
      return false;

    var values = {};
    values.text     = template.find("#text").value;
    values.lat      = template.find("#lat").value;
    values.lng      = template.find("#lng").value;
    values.city     = template.find("#city").value;
    values.country  = template.find("#country").value;
    values.region   = template.find("#region").value;
    values.groupId  = getCurrentGroupId();

    if (values.groupId && values.text.length) {
      Meteor.call('createActivity', values, function (error, activityId) {
        if (error) {
          Session.set("createError", error);
        } else {
          template.find("#text").value = 
          template.find("#lat").value = 
          template.find("#lng").value = 
          template.find("#location").value =
          template.find("#city").value =
          template.find("#country").value =
          template.find("#region").value = "";

          template.find(".text-length").innerHTML = shortMaxLength();
        }
      });
    } else {
      Session.set("createError",
                  "It needs to have text");
    }
    return false;
  }
});