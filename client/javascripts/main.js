// Underplan -- client
Meteor.subscribe("activities");
Meteor.subscribe("allComments");
Meteor.subscribe("allGroups");
Meteor.subscribe("directory");

///////////////////////////////////////////////////////////////////////////////
// Templates

this.feedLimitSkip   = 5;
this.defaultMapZoom  = 12;
this.shortMaxLength  = 250;

this.appTemplates = function () {
  return {
    groupInviteList: "showInviteList",
    currentActivity: "showActivity",
    storyEditor: "showStoryEditor",
    groupEditor: "showGroupEditor",
    activityMap: "showActivityMap",
    mainHome: "showGroupList",
    userSettings: "showUserSettings",
    loginForm: "showLoginForm",
    mainSettings: "showMainSettings"
  };
};

this.showTemplate = function (templateName, callback) {
  var conditions = this.appTemplates();

  _.each(_.keys(conditions), function (key) {
    if (key === templateName) {
      Session.set(conditions[key], true);
    } else {
      Session.set(conditions[key], false);
    }
  });

  if (_.isFunction(callback)) {
    callback();
  }
};

// var initTemplateChecks = function() {
//   var conditions = appTemplates();

//   _.each(_.keys(conditions), function(key) {
//     var value = conditions[key];
//     Template.page[value] = function () {
//       return Session.get(value);
//     };
//   });
// };

Template.page.showGroupList = function () {
  return Session.get("showGroupList");
};

Template.page.showGroupEditor = function () {
  return Session.get("showGroupEditor");
};

Template.page.showActivityMap = function () {
  return Session.get("showActivityMap");
};

Template.page.showStoryEditor = function () {
  return Session.get("showStoryEditor");
};

Template.page.showActivity = function () {
  return Session.get("showActivity");
};

Template.page.showGroupList = function () {
  return Session.get("showGroupList");
};

Template.page.showUserSettings = function () {
  return Session.get("showUserSettings");
};

Template.page.showMainSettings = function () {
  return Session.get("showMainSettings");
};

///////////////////////////////////////////////////////////////////////////////
// Common Functions

// FIXME: move the maps api key to the settings file
this.appSettings = function () {
  return {mapsApiKey: "AIzaSyCaBJe5zP6pFTy1qio5Y6QLJW9AdQsPEpQ"};
};


this.getCurrentActivity = function () {
  var result = null;

  if (Session.get("activitySlug")) {
    var activity = Activities.findOne({slug: Session.get("activitySlug")});

    if (activity) { // activity hasn't loaded!
      result = activity;
    }
  }
  return result;
};

this.getCurrentActivityId = function () {
  var activity = getCurrentActivity();
  var result = null;

  if (activity) { // activity hasn't loaded!
    Session.set("activityId", activity._id);
    result = Session.get("activityId");
  }

  return result;
};

this.currentActivityHasPhotos = function () {
  var activity = this.getCurrentActivity();
  var result = false;

  if (activity) {
    result = !!activity.picasaTags && activity.picasaTags.length;
  }

  return result;
};

this.currentActivityHasMap = function () {
  var activity = this.getCurrentActivity();
  var result = false;

  if (activity) {
    result = activity.lat && activity.lng;
  }

  return result;
};

this.getCurrentGroup = function () {
  var result = null;

  if (Session.get("groupId")) {
    result = Groups.findOne(Session.get("groupId"));
  }

  return result;
};

this.isFollowingGroup = function (userId, groupId) {
  var user = Meteor.users.findOne({_id: userId});
  var result = false;

  if (user && user.profile.followedGroups) {
    result = user.profile.followedGroups[groupId];
  }

  return result;
};

// Set group follow for current user
this.followGroup = function (groupId, state) {
  if (state === undefined) {
    state = true;
  }

  var currentFollows = Meteor.user().profile.followedGroups || {};
  currentFollows[groupId] = state;

  Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.followedGroups": currentFollows}});
};

this.followCurrentGroup = function (state) {
  if (state === undefined) {
    state = true;
  }

  this.followGroup(this.getCurrentGroupId(), state);
};

this.getCurrentGroupId = function () {
  var group = this.getCurrentGroup();
  return !!group ? group._id : null;
};

this.resetGroup = function () {
  Session.set("groupId", null);
  Session.set("groupSlug", null);
};

this.userBelongsToCurrentGroup = function (userId) {
  var group = this.getCurrentGroup();
  var result;

  if (!group) {
    result = false;
  } else {
    result = this.userBelongsToGroup(userId, group._id);
  }

  return result;
};

this.currentUserBelongsToCurrentGroup = function () {
  return this.userBelongsToCurrentGroup(Meteor.userId());
};

this.defaultBack = function () {
  var group = this.getCurrentGroup();
  if (group) {
    Router.setGroup(group);
  } else {
    Router.setHome();
  }
};

this.autocomplete = null;

this.geoLocation = function (location, inputId, callback) {
  if (typeof google === "object" && typeof google.maps === "object") {
    var lat, lng, result;
    var pac_input = document.getElementById(inputId);

    autocomplete = new google.maps.places.Autocomplete(pac_input);

    google.maps.event.addListener(autocomplete, 'place_changed', function () {
      var place = autocomplete.getPlace();

      if (!place || !place.geometry) {
        return false;
      }

      lat = place.geometry.location.lat() || place.geometry.location.Ya || place.geometry.location.hb;
      lng = place.geometry.location.lng() || place.geometry.location.Za || place.geometry.location.ib;

      var city, region, country;
      for (var i=0; i < place.address_components.length; i++) {
        if (place.address_components[i].types[0] == "locality") {
          //this is the object you are looking for
          city = place.address_components[i].long_name;
        }
        
        if (place.address_components[i].types[0] == "administrative_area_level_1") {
          //this is the object you are looking for
          region = place.address_components[i].long_name;
        }
        
        if (place.address_components[i].types[0] == "country") {
          //this is the object you are looking for
          country = place.address_components[i].long_name;
        }
      }

      result = {
        lat: lat, 
        lng: lng, 
        address: place.formatted_address,
        city: city,
        region: region,
        country: country
      };

      if(typeof callback == "function") {
        callback(result);
      } else {
        return result;
      }
    });
  } else {
    return false;
  }
};

this.logRenders = function () {
  _.each(Template, function (template, name) {
    var oldRender = template.rendered;
    var counter = 0;

    template.rendered = function () {
      console.log(name, "render count: ", ++counter);
      oldRender && oldRender.apply(this, arguments);
    };
  });
}

Meteor.startup(function () {
  Session.set("appVersion", "v0.9.81");

  // Routing
  Backbone.history.start({ pushState: true });

  // Mixpanel tracking
  mixpanel.init(Meteor.settings.public.mixpanelToken);

  // Foundation js loader
  $(document).foundation();

  Meteor.autorun(function () {
    // if (! Session.get("groupName")) {  
    //   Session.set("groupName", "A Trip");
    // }
    // if (! Session.get("selectedActivity")) {  
    //   var activity = Activities.findOne();
    //   if (activity)
    //     Session.set("selectedActivity", activity._id);
    // }
  });
});