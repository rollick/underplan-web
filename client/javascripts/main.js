// Underplan -- client

this.isDev = function () {
  return Meteor.settings.public.env == "dev";
}

this.logIfDev = function (message) {
  if(isDev())
    console.log("Underplan: " + message);
}

// Some defaults
this.feedLimitSkip   = 5;
this.galleryLimitSkip = 40;
this.defaultMapZoom  = 12;
this.shortMaxLength  = 250;
this.feedGallery = null;

// Meteor.subscribe("activities");
Meteor.subscribe("groups");
Meteor.subscribe("recentActivities");
Meteor.subscribe("directory");
Meteor.subscribe("userDetails");

var self = this;
self.commentsSubscription = self.activitiesSubscription = null;
self.activityCommentStatus = {};

///////////////////////////////////////////////////////////////////////////////
// Meteor Startup

Meteor.startup(function () {
  logIfDev("===Starting Underplan===");

  Session.set("appVersion", "v1.3.140");
  Session.set('mapReady', false);

  // Mixpanel tracking
  mixpanel.init(Meteor.settings.public.mixpanelToken);

  // Routing
  Backbone.history.start({ pushState: true });

  // Foundation js loader
  $(document).foundation();

  // set fullscreen class on body for use with slider / gallery code
  if (screenfull.enabled) {
    document.addEventListener(screenfull.raw.fullscreenchange, function () {
      if(screenfull.isFullscreen)
        $("body").addClass("fullscreen");
      else
        $(".fullscreen").removeClass("fullscreen");
    });
  }

  ///////////////////////////////////////////////////////////////////////////////
  // Main Autorun Deps

  Deps.autorun(function () {

    var activityId = ReactiveGroupFilter.get("activity");
    if (activityId) {
      logIfDev("Subscribe to activity");

      self.activitySubscription = Meteor.subscribe("activityShow", activityId);
      self.commentsSubscription = Meteor.subscribe("activityComments", activityId);
    }

    var groupId = ReactiveGroupFilter.get("group");
    if (groupId) {
      logIfDev("Subscribe to group data");

      // clear any map markers
      if (gmaps && _.isFunction(gmaps.clearMarkers))
        gmaps.clearMarkers();
      
      var filter = ReactiveGroupFilter.get("feedFilter") || {};
      if (filter.group !== groupId) {
        // set the group without causing reactive
        ReactiveGroupFilter.set('group', groupId, {quiet: true});
      }
      if (!filter.limit) {
        // set the group without causing reactive
        ReactiveGroupFilter.set('limit', feedLimitSkip, {quiet: true});
      }

      self.feedMapSubscription = Meteor.subscribe("basicActivityData", groupId);

      var options = ReactiveGroupFilter.get("subscriptionOptions");
      self.feedListSubscription = Meteor.subscribe("feedActivities", options);
      self.feedCommentsSubscription = Meteor.subscribe("feedCommentCounts", options);    
    }

    if (Session.get("expandedActivities")) {
      var options = {
        groupId: groupId,
        activityIds: Session.get("expandedActivities"),
        limit: ReactiveGroupFilter.get("limit"),
        country: ReactiveGroupFilter.get("country")
      };

      if (options.activityIds.length)
        self.commentsSubscription = Meteor.subscribe("openFeedComments", options);
    }

    var group = Groups.findOne(ReactiveGroupFilter.get("group"));
    if (!!group)
      document.title = "Underplan: " + group.name;
  });
});

///////////////////////////////////////////////////////////////////////////////
// Common Functions

this.navHeight = function () {
  return parseInt($('.nav').css('height'));
};

// FIXME: move the maps api key to the settings file
this.appSettings = function () {
  return {mapsApiKey: "AIzaSyCaBJe5zP6pFTy1qio5Y6QLJW9AdQsPEpQ"};
};

this.getCurrentActivity = function () {
  return Activities.findOne(ReactiveGroupFilter.get("activity"));
};

this.getCurrentActivityId = function () {
  return ReactiveGroupFilter.get("activity");
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
  return Groups.findOne(ReactiveGroupFilter.get("group"));
};

this.getCurrentGroupId = function () {
  return ReactiveGroupFilter.get("group");
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

  this.followGroup(this.ReactiveGroupFilter.get("group"), state);
};

this.userBelongsToCurrentGroup = function (userId) {
  var group = this.Groups.findOne(ReactiveGroupFilter.get("group"));
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
  var group = this.Groups.findOne(ReactiveGroupFilter.get("group"));
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
        if (_.indexOf(place.address_components[i].types, "locality") >= 0) {
          //this is the object you are looking for
          city = place.address_components[i].long_name;
        }
        
        if (_.indexOf(place.address_components[i].types, "administrative_area_level_1") >= 0) {
          //this is the object you are looking for
          region = place.address_components[i].long_name;
        }
        
        if (_.indexOf(place.address_components[i].types, "country") >= 0) {
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
      logIfDev(name, "render count: ", ++counter);
      
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
    logIfDev("Mixpanel not loaded. Missed an event!");
  }
};
