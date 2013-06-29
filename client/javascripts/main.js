// Underplan -- client
// Meteor.subscribe("activities");
Meteor.subscribe("groups");
Meteor.subscribe("directory");

var self = this;
self.commentsSubscription = self.activitiesSubscription = null;

Deps.autorun(function () {
  if (Session.get("activitySlug")) {
    var activity = Activities.findOne({slug: Session.get("activitySlug")});

    if (activity) { // activity hasn't loaded!
      Session.set("activityId", activity._id);
    }
  } else {
    Session.set("activityId", null);
  }

  if (Session.get("groupSlug")) {
    var group = Groups.findOne({slug: Session.get("groupSlug")});

    if (group) { // activity hasn't loaded!
      Session.set("groupId", group._id);
    }
  } else {
    Session.set("groupId", null);
  }

  if (Session.get("groupId")) {
    var filter = Session.get("feedFilter") || {};
    if (filter.group !== Session.get("groupId")) {
      filter.group = Session.get("groupId");
      Session.set("feedFilter", filter);
    }
  }

  self.commentsSubscription = Meteor.subscribe("comments", Session.get("groupId"));
  self.activitiesSubscription = Meteor.subscribe("activities", Session.get("groupId"));

  // if (! Session.get("groupName")) {  
  //   Session.set("groupName", "A Trip");
  // }
  // if (! Session.get("selectedActivity")) {  
  //   var activity = Activities.findOne();
  //   if (activity)
  //     Session.set("selectedActivity", activity._id);
  // }
});

Meteor.startup(function () {
  Session.set("appVersion", "v1.3b");

  // Routing
  Backbone.history.start({ pushState: true });

  // Mixpanel tracking
  mixpanel.init(Meteor.settings.public.mixpanelToken);

  // Foundation js loader
  $(document).foundation();
});

///////////////////////////////////////////////////////////////////////////////
// Templates

this.feedPackery = null;
this.feedLimitSkip   = 5;
this.galleryLimitSkip = 40;
this.defaultMapZoom  = 12;
this.shortMaxLength  = 250;

Galleria.configure({
  imageCrop: false
});
this.picasa = new Galleria.Picasa();
this.feedGallery = null;

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

this.repackFeed = function () {
  if(!_.isNull(feedPackery))
    feedPackery.layout();
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
  return Activities.findOne(Session.get("activityId"));
};

this.getCurrentActivityId = function () {
  return Session.get("activityId");
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
  return Groups.findOne(Session.get("groupId"));
};

this.getCurrentGroupId = function () {
  return Session.get("groupId");
};

this.isFollowingGroup = function (userId, groupId) {
  var user = Meteor.users.findOne({_id: userId});
  var result = false;

  if (user && user.profile.followedGroups) {
    result = user.profile.followedGroups[groupId];
  }

  return result;
};

// Set group followed (true/false) for current user
this.followGroup = function (groupId, state) {
  if (state === undefined) {
    state = true;
  }

  var currentFollows = Meteor.user().profile.followedGroups || {};
  currentFollows[groupId] = state;

  Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.followedGroups": currentFollows}});

  // Track for the change
  var eventName = state ? "Group Followed" : "Group Unfollowed";
  trackEvent(eventName, {"Group ID": groupId});
};

this.followCurrentGroup = function (state) {
  if (state === undefined) {
    state = true;
  }

  this.followGroup(this.getCurrentGroupId(), state);
};

this.resetGroup = function () {
  Session.set("groupId", null);
  Session.set("groupSlug", null);
  Session.set("activityId", null);
  Session.set("activitySlug", null);
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
};

this.trackEvent = function(eventName, properties) {
  if(typeof mixpanel === "object") {
    if(!!Meteor.userId()) {
      mixpanel.identify(Meteor.userId());

      var user = Meteor.user();
      if (user) { // FIXME: can't always rely on the user data being present
        mixpanel.name_tag(userEmail(user));
        mixpanel.people.set({
          "$name": user.profile.name,
          "$created": (new Date(user.createdAt)).toUTCString(),
          "$email": userEmail(user)
        });        
      }
    }

    mixpanel.track(eventName, properties);
  } else {
    console.log("Mixpanel not loaded. Missed an event!");
  }
};