var AppRouter = Backbone.Router.extend({
  routes: {
    "":                               "main",
    "new":                            "newGroup",
    "user/settings":                  "userSettings",
    "settings":                       "mainSettings",
    ":groupSlug":                     "group",
    ":groupSlug/settings":            "groupSettings",
    ":groupSlug/new":                 "newActivity",
    ":groupSlug/membership":          "groupMembership",
    ":groupSlug/pl/:activityId":      "permaActivity",
    ":groupSlug/:activitySlug":       "activity",
    ":groupSlug/:activitySlug/edit":  "editActivity",
    ":groupSlug/pl/:activityId/edit": "editShortActivity",
  },

  routeLabels: {
    "":                               "Landing Page Loaded",
    "new":                            "New Group Loaded",
    "user/settings":                  "User Settings Loaded",
    "settings":                       "Settings Loaded",
    ":groupSlug":                     "Group Loaded",
    ":groupSlug/settings":            "Group Settings Loaded",
    ":groupSlug/new":                 "New Activity Loaded",
    ":groupSlug/membership":          "Group Membership Loaded",
    ":groupSlug/pl/:activityId":      "Activity Loaded",
    ":groupSlug/:activitySlug":       "Story Loaded",
    ":groupSlug/:activitySlug/edit":  "Story Editor Loaded",
    ":groupSlug/pl/:activityId/edit": "Shorty Editor Loaded",
  },

  before: function(route, params) {
    // Shouldn't be any create errors when re-routing
    Session.set("createError", null);

    // Some permission checks:
    // settings only for logged in users
    if(!Meteor.userId()) {
      if(!!route.match(/setting/)) {
        this.setHome();
        return false;
      } else if(!!route.match(/^new$/)) {
        Session.set("message",
                    "You must be logged in to create a group");
        this.setHome();
        return false;
      }
    }
  },

  after: function(route, params) {
    var label = this.routeLabels[route];
    if(!label)
      label = "Unknown route loaded";

    var path = "/" + route;

    if (typeof params.forEach !== "undefined") {
      params.forEach( function(part) {
        path = path.replace(/:[a-z|0-9|-]*/i, part);
      });
    }

    trackEvent(label, {route: route, params: params, path: path});
  },

  ////////////////////////
  // Main Routing Functions

  main: function() {
    this.resetGroup();

    Session.set("mainTemplate", "mainHome");

    this.jumpToTop().mapToSmall();
  },

  group: function(groupSlug) {
    this.runSetGroup(groupSlug, function () {
      Session.set("expandedActivities", []);
      ReactiveGroupFilter.set("activity", null);
      ReactiveGroupFilter.set("country", null);

      Session.set("mainTemplate", "blank");
    });
    
    this.jumpToTop().mapToFullscreen();
  },

  mainSettings: function() {
    Session.set("mainTemplate", "mainSettings");
  },

  groupSettings: function(groupSlug) {
    this.runSetGroup(groupSlug);

    Session.set("mainTemplate", "mainSettings");
  },

  newGroup: function() {
    Session.set("mainTemplate", "groupEditor");
    
    this.jumpToTop();
  },

  userSettings: function() {
    Session.set("mainTemplate", "userSettings");

    this.jumpToTop();
  },

  groupMembership: function(groupSlug) {
    this.runSetGroup(groupSlug);

    Session.set("mainTemplate", "groupInviteList");
  },

  newActivity: function(groupSlug) {
    this.runSetGroup(groupSlug);
    ReactiveGroupFilter.set("activity", null);

    Session.set("mainTemplate", "storyEditor");
    this.jumpToTop().mapToSmall();
  },

  activity: function(groupSlug, activitySlug) {
    var parts = activitySlug.split("?");
    this.runSetActivity(groupSlug, parts[0]);

    Session.set("mainTemplate", "currentActivity");
    
    this.jumpToTop().mapToSmall();
  },

  permaActivity: function(groupSlug, activityId) {
    var parts = activityId.split("?");
    this.runSetActivity(groupSlug, parts[0], true);

    Session.set("mainTemplate", "currentActivity");
    
    this.jumpToTop().mapToSmall();
  },

  editActivity: function(groupSlug, activitySlug) {
    var parts = activitySlug.split("?");
    this.runSetActivity(groupSlug, parts[0], true);

    Session.set("mainTemplate", "storyEditor");
    this.jumpToTop().mapToSmall();      
  },

  editShortActivity: function(groupSlug, activityId) {
    var parts = activityId.split("?");
    this.runSetActivity(groupSlug, parts[0], true);

    Session.set("mainTemplate", "shortyEditor");
    
    this.jumpToTop().mapToSmall();      
  },

  ////////////////////////
  // Routing API Functions

  setHome: function() {
    this.navigate("", true);
  },

  setMainSettings: function(group) {
    if(!group || typeof group == "undefined") {
      this.navigate("settings", true);
    } else {
      this.navigate(group.slug + "/settings", true);
    }
  },

  setGroupEditor: function (group) {
    this.navigate(group.slug + "/settings", true);
  },

  setGroupMembership: function(group) {
    this.navigate(group.slug + "/membership", true);
  },

  setNewGroup: function () {
    this.navigate("new", true);
  },

  setUserSettings: function () {
    this.navigate("user/settings", true);
  },

  setGroup: function(group) {
    if (!group || typeof group === "undefined") {
      this.navigate("", true);
    } else {
      this.navigate(group.slug, true);
    }
  },

  setEditActivity: function(activity) {
    var group = Groups.findOne({_id: activity.group}, {slug: 1});

    this.navigate(group.slug + "/" + activity.slug + "/edit", true);
  },

  setEditShortActivity: function(activity) {
    var group = Groups.findOne({_id: activity.group}, {slug: 1});

    this.navigate(group.slug + "/pl/" + activity._id + "/edit", true);
  },

  setActivity: function(activity) {
    if(typeof activity == "string") {
      activity = Activities.findOne({_id: activity});
    }

    // Use permalink if no slug defined, eg a shorty
    if (!activity.slug)
      this.setPermaActivity(activity);
    else {
      var groupSlug = Groups.findOne(activity.group).slug;
      this.navigate(groupSlug + "/" + activity.slug, true);
    }
  },

  setPermaActivity: function(activity) {
    if(typeof activity == "string") {
      activity = Activities.findOne({_id: activity});
    }
    var groupSlug = Groups.findOne(activity.group).slug;

    this.navigate(groupSlug + "/pl/" + activity._id, true);
  },

  setNewActivity: function (group) {
    this.navigate(group.slug + "/new", true)
  },

  ////////////////////////
  // Common Functions

  runSetActivity: function (groupSlug, activityId, isPermalink) {
    isPermalink = isPermalink || false;
    this.runSetGroup(groupSlug);

    var options = {};
    if (isPermalink)
      options._id = activityId;
    else
      options.slug = activityId;

    // The activity record might not be fetched yet if the user has just arrived at the site.
    // Use a deps.autorun to get the group once the record has been received.
    if (ReactiveGroupFilter.get("activity") !== activityId) {
      Deps.autorun( function (computation) {
        var group = Groups.findOne({slug: groupSlug});

        if (group) {
          var activity = Activities.findOne(_.extend(options, {group: group._id}));

          if (activity) {
            logIfDev("++ Setting activity from router");

            ReactiveGroupFilter.set("activity", activity._id);
            computation.stop();
          }
        }
      });
    }
  },

  runSetGroup: function (groupSlug, callback) {
    // The group record might not be fetched yet if the user has just arrived at the site.
    // Use a deps.autorun to get the group once the record has been received.
    Deps.autorun( function (computation) {
      var group = Groups.findOne({slug: groupSlug});

      if (group){
        ReactiveGroupFilter.set("group", group._id);
        if (_.isFunction(callback))
          callback.call();
        computation.stop();
      }
    });
  },

  resetGroup: function () {
    ReactiveGroupFilter.clear();
  },

  jumpToTop: function() {
    $('html,body').scrollTop(0);

    return this;
  },

  mapToCls: function (mapCls, fit) {
    var element = $('.top-extra');
    var oldHeight = element.height();

    // Remove height which could be added be dragging map handle
    element.removeAttr("style");

    // Remove all classes except top-extra and then add new class
    element.removeClass(function(i, cls) {
      var list = cls.split(' ');
      return  list.filter(function(val) {
        return (val != 'top-extra');
      }).join(' ');
    }).addClass(mapCls);

    if (gmaps && gmaps.map) {
      // Check for css animation end to refresh map tiles
      var transitions = 'webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend';
      element.one(transitions, function(event) {
        google.maps.event.trigger(gmaps.map, 'resize');

        var newHeight = $(element).css("height");
        // gmaps.map.panBy(0, (parseInt(oldHeight) - parseInt(newHeight)) / 2); 
        
        if (fit) {
          var bounds = gmaps.bounds();
          gmaps.map.panToBounds(bounds);
          google.maps.event.addListenerOnce(gmaps.map, "idle", function() {
            this.panTo(bounds.getCenter());
          })
        }
      });
    }

    return this;
  },

  mapToFullscreen: function() {
    return this.mapToCls('fullscreen', true);
  },

  mapToSmall: function() {
    return this.mapToCls('default');
  }
});

Router = new AppRouter();