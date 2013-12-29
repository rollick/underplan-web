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
Meteor.subscribe("directory");
Meteor.subscribe("userDetails");

this.commentsSubscription = 
this.activitiesSubscription = 
this.feedListSubscription = null;
this.activityCommentStatus = {};

this.mappingFsm = new MappingFsm(); // ... now call setup() after google.maps has loaded

///////////////////////////////////////////////////////////////////////////////
// Meteor Startup

Meteor.startup(function () {
  logIfDev("===Starting Underplan===");

  // Override the no js message
  $('head').append(document.createElement('style'));
  var bodyStyle = document.styleSheets[document.styleSheets.length-1];

  var beforeStyle = "body::before { content: \"\"; line-height: 0px; margin-left: 0px; }";
  if (bodyStyle.insertRule) {
    bodyStyle.insertRule(beforeStyle, bodyStyle.cssRules.length);
  }

  Session.set("appVersion", "v1.3.243");
  Session.set('mapReady', false);
  ReactiveGroupFilter.set("groupSlug", null);

  // Mixpanel tracking
  mixpanel.init(Meteor.settings.public.mixpanelToken);

  // Google map init
  GoogleMaps.init({
      sensor: true,
      libraries: 'places'
      // 'key': 'MY-GOOGLEMAPS-API-KEY',
      // 'language': 'de'
    },
    function() {
      mappingFsm.setup();

      // Routing should start after loading the maps
      // as the route state call the maps state manager
      Backbone.history.start({pushState: true});
    }
  );

  // set fullscreen class on body for use with slider / gallery code
  if (screenfull.enabled) {
    document.addEventListener(screenfull.raw.fullscreenchange, function () {
      if(screenfull.isFullscreen)
        $("body").addClass("fullscreen");
      else
        $(".fullscreen").removeClass("fullscreen");
    });
  }

  // use router to handle all links not already handled unless we set data-bypass
  // TODO: should we go through and update code to use the code path below to handle 
  //       links which are just calling Router.navigate anyway?!
  //
  $(document).on('click', 'a[href]:not([data-bypass])', function (ev) {
    var href = { prop: $(this).prop('href'), attr: $(this).attr('href') },
        root = location.protocol + '//' + location.host;

    if (href.prop.slice(0, root.length) === root) {
      ev.preventDefault();
      Router.navigate(href.attr, true);
    }
  });


  ///////////////////////////////////////////////////////////////////////////////
  // Main Autorun Deps

  Deps.autorun(function (computation) {
    // If no group / activity set then subscribe to the home page recent activities
    var options = ReactiveGroupFilter.get("subscriptionOptions");

    // Subscribe to group info for getting a list of countries and the number of
    // activities per country
    if (options.groupId) {
      logIfDev("Subscribe to basic group data");

      Meteor.subscribe("currentGroupInfo", options.groupId);
    }

    if (!options.groupId) {
      logIfDev("Subscribe to recent site activities");

      Meteor.subscribe("recentActivities");
    }

    if (options.groupId && options.limit) {
      logIfDev("Subscribe to group feed/map data");

      Session.set("feedActivitiesReady", false);
      self.feedListSubscription = Meteor.subscribe("feedActivities", options, function () {
        // refresh map markers
        mappingFsm.setupGroupMarkers();
        Session.set("feedActivitiesReady", true);
      });

      self.feedCommentsSubscription = Meteor.subscribe("feedCommentCounts", options);
    }
  });

  Deps.autorun(function (computation) {
    var group = Groups.findOne(ReactiveGroupFilter.get("group"));
    if (!!group)
      document.title = "Underplan: " + group.name;
  });

  // Fetch open comments for feed
  Deps.autorun(function (computation) {
    var groupId = ReactiveGroupFilter.get("group");

    if (Session.get("expandedActivities")) {
      var options = {
        groupId: groupId,
        activityIds: Session.get("expandedActivities"),
        limit: ReactiveGroupFilter.get("limit"),
        country: ReactiveGroupFilter.get("country")
      };

      if (options.activityIds.length) {
        logIfDev("Subscribe to open comments");

        self.commentsSubscription = Meteor.subscribe("openFeedComments", options);
      }
    }
  });

  Deps.autorun( function (computation) {
    var group = Groups.findOne(ReactiveGroupFilter.get('group'));

    if (!group)
      return;

    var activityId = ReactiveGroupFilter.get('activity'),
        activitySlug = ReactiveGroupFilter.get('activitySlug');

    ////
    // This will set the template for based on an activity type (story or shorty) 
    // and an action (show or edit). The type is based on whether the activity or 
    // activitySlug field is set in the ReactiveGroupFilter but currently we are
    // using the same Handlebars "show" template for a shorty and a story so it isn't 
    // important for that action. The edit action will render different templates for
    // the shorty and story types so we need to check the current router state:
    //    if it includes "edit" and "pl" then render the shorty editor
    //    otherwise if it includes "edit" then render the story editor
    //

    var activityValue = activityId || activitySlug;

    if (activityValue) {
      logIfDev("++ Subscribe to activity");

      activitySubscription = Meteor.subscribe("activityShow", activityValue, group._id, function () {
        // Now safe to assign the activity id - only 
        var value = this.params[0];
        var activityConds = {
          group: this.params[1],
          $or: [{_id: value}, {slug: value}]
        };
        
        var activity = Activities.findOne(activityConds);

        if (!activity) {
          Session.set("error", "Could not find activity");
          Router.setGroup(group);
        } else {
          ReactiveGroupFilter.set("activity", activity._id);
        }
      });
      commentsSubscription = Meteor.subscribe("activityComments", activityValue, group._id);
    }
  });


  Deps.autorun( function (computation) {
    var country = ReactiveGroupFilter.get("country"),
        groupId = ReactiveGroupFilter.get("group");

    if (!groupId)
      return;

    var params = {
      $and: [
        {group: groupId}
      ]};

    if (country)
      params['$and'].push({"country": country});

    var ids = [];
    Activities.find(params, {fields: {_id: 1}, sort: {created: 1, _id: 1}}).forEach(function (activity) {
      ids.push(activity._id);
    });

    Session.set("activityIdsSorted", ids);
  });

});

///////////////////////////////////////////////////////////////////////////////
// Common Functions

this.navHeight = function () {
  return parseInt($('.nav').css('height'));
};

// FIXME: move the maps api key to the settings file
this.appSettings = {
  mapsApiKey: "AIzaSyCaBJe5zP6pFTy1qio5Y6QLJW9AdQsPEpQ"
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

this.geoLocation = function (location, inputId, autocomplete, callback) {
  if (typeof google === "object" && typeof google.maps === "object") {
    var lat, lng, result;

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
