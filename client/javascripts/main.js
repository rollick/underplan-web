// Underplan -- client

this.isDev = function () {
  return Meteor.settings.public.env == "dev";
};

// Meteor.subscribe("activities");
Meteor.subscribe("groups");
Meteor.subscribe("directory");
Meteor.subscribe("userDetails");

var self = this;
self.commentsSubscription = self.activitiesSubscription = null;
self.activityCommentStatus = {};

Deps.autorun(function () {

  if (Session.get("groupSlug")) {
    var group = Groups.findOne({slug: Session.get("groupSlug")});

    if (group) { // activity hasn't loaded!
      Session.set("groupId", group._id);
    }
  } else {
    Session.set("groupId", null);
  }

  if (Session.get("activitySlug")) {
    var activity = Activities.findOne({ slug: Session.get("activitySlug") });

    if (activity) { // activity hasn't loaded!
      Session.set("activityId", activity._id);
    }
  }

  if (Session.get("activityId")) {
    console.log("Subscribe to activity");

    self.activitySubscription = Meteor.subscribe("activityShow", Session.get("activityId"));
    self.commentsSubscription = Meteor.subscribe("activityComments", Session.get("activityId"));
  }

  if (Session.get("groupId")) {
    console.log("Subscribe to group data");
    
    var filter = Session.get("feedFilter") || {};
    if (filter.group !== Session.get("groupId")) {
      filter.group = Session.get("groupId");
      Session.set("feedFilter", filter);
    }

    self.feedMapSubscription = Meteor.subscribe("basicActivityData", Session.get("groupId"));

    // Pass some options to the subscription to restrict the amount of data returned
    var options = {
      groupId: Session.get("groupId"),
      limit: Session.get("feedLimit"),
      country: Session.get("feedFilter").country
    }
    self.feedListSubscription = Meteor.subscribe("feedActivities", options);
    self.feedCommentsSubscription = Meteor.subscribe("feedCommentCounts", options);
  }

  if (Session.get("expandedActivities")) {
    var options = {
      groupId: Session.get("groupId"),
      activityIds: Session.get("expandedActivities"),
      limit: Session.get("feedLimit"),
      country: Session.get("feedFilter").country
    };

    if (options.activityIds.length)
      self.commentsSubscription = Meteor.subscribe("openFeedComments", options);
  }
});

Meteor.startup(function () {
  Session.set("appVersion", "v1.3.9");

  // Mixpanel tracking
  mixpanel.init(Meteor.settings.public.mixpanelToken);

  // Routing
  Backbone.history.start({ pushState: true });

  // Foundation js loader
  $(document).foundation();
});

///////////////////////////////////////////////////////////////////////////////
// Templates

this.feedLimitSkip   = 5;
this.galleryLimitSkip = 40;
this.defaultMapZoom  = 12;
this.shortMaxLength  = 250;

Galleria.configure({
  imageCrop: false,
  debug: isDev()
});
this.picasa = new Galleria.Picasa();
this.trovebox = new Galleria.Trovebox();
this.feedGallery = null;

this.appTemplates = function () {
  return {
    groupInviteList:  "showInviteList",
    currentActivity:  "showActivity",
    storyEditor:      "showStoryEditor",
    groupEditor:      "showGroupEditor",
    activityFeed:     "showActivityFeed",
    mainHome:         "showGroupList",
    userSettings:     "showUserSettings",
    loginForm:        "showLoginForm",
    mainSettings:     "showMainSettings",
    permaShorty:      "showPermaShorty"
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

Template.page.showGroupList = function () {
  return Session.get("showGroupList");
};

Template.page.showGroupEditor = function () {
  return Session.get("showGroupEditor");
};

Template.page.showActivityFeed = function () {
  return Session.get("showActivityFeed");
};

Template.page.showStoryEditor = function () {
  return Session.get("showStoryEditor");
};

Template.page.showActivity = function () {
  return Session.get("showActivity");
};

Template.page.showPermaShorty = function () {
  return Session.get("showPermaShorty");
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
  var groupName = Groups.findOne(groupId, {$fields: {name: 1}}).name;
  var eventName = state ? "Group Followed" : "Group Unfollowed";
  trackEvent(eventName, {"Group ID": groupId, "Group Name": groupName});
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
        if (_.indexOf(place.address_components[i].types, "locality")) {
          //this is the object you are looking for
          city = place.address_components[i].long_name;
        }
        
        if (_.indexOf(place.address_components[i].types, "administrative_area_level_1")) {
          //this is the object you are looking for
          region = place.address_components[i].long_name;
        }
        
        if (_.indexOf(place.address_components[i].types, "country")) {
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

this.formattedDate = function (dateValue) {
  moment.lang('en', {
    calendar : {
      lastDay : '[Yesterday at] LT',
      sameDay : '[Today at] LT',
      nextDay : '[Tomorrow at] LT',
      lastWeek : 'D MMMM',
      nextWeek : 'dddd [at] LT',
      sameElse : 'D MMMM YYYY'
    }
  });

  if(dateValue) {
    return Handlebars._escape(moment(dateValue).calendar());
  }
  return '';
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
