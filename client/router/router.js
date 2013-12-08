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

  // Map a main template selection to a MappingFsm state and event
  // Call setMainTemplate to use.
  templateMappings: {
    mainHome: {
      map: {
        evt: "HomeMapReady",
        state: "recentAll"        
      }
    },
    groupMain: {
      map: {
        evt: "GroupMapReady",
        state: "recentGroup"        
      }
    },
    currentActivity: {
      map: {
        evt: "ActivityMapReady",
        state: "showActivity"        
      }
    },
    storyEditor: {
      map: {
        evt: "ActivityMapReady",
        state: "showActivity"        
      }
    },
    shortyEditor: {
      map: {
        evt: "ActivityMapReady",
        state: "showActivity"        
      }
    }
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

    this.setMainTemplate("mainHome");
  },

  group: function(groupSlug) {
    var self = this;
    this.runSetGroup(groupSlug, function () {
      Session.set("expandedActivities", []);
      ReactiveGroupFilter.set("activity", null);
      ReactiveGroupFilter.set("country", null);

      self.setMainTemplate("groupMain");
    });
  },

  mainSettings: function() {
    this.setMainTemplate("mainSettings");
  },

  groupSettings: function(groupSlug) {
    this.runSetGroup(groupSlug);

    this.setMainTemplate("mainSettings");
  },

  newGroup: function() {
    this.setMainTemplate("groupEditor");
    
    this.jumpToTop();
  },

  userSettings: function() {
    this.setMainTemplate("userSettings");

    this.jumpToTop();
  },

  groupMembership: function(groupSlug) {
    this.runSetGroup(groupSlug);

    this.setMainTemplate("groupInviteList");
  },

  newActivity: function(groupSlug) {
    this.runSetGroup(groupSlug);
    ReactiveGroupFilter.set("activity", null);

    this.setMainTemplate("storyEditor");
    this.jumpToTop().mapToSmall();
  },

  activity: function(groupSlug, activitySlug) {
    var parts = activitySlug.split("?"),
        self = this;

    this.runSetActivity(groupSlug, parts[0], null, function () {
      self.setMainTemplate("currentActivity");
    });
  },

  permaActivity: function(groupSlug, activityId) {
    var parts = activityId.split("?"),
        self = this;

    this.runSetActivity(groupSlug, parts[0], true, function () {
      self.setMainTemplate("currentActivity");
    });
  },

  editActivity: function(groupSlug, activitySlug) {
    var parts = activitySlug.split("?"),
        self = this;

    this.runSetActivity(groupSlug, parts[0], true, function () {
      self.setMainTemplate("storyEditor");
    });
  },

  editShortActivity: function(groupSlug, activityId) {
    var parts = activityId.split("?"),
        self = this;

    this.runSetActivity(groupSlug, parts[0], true, function () {
      self.setMainTemplate("shortyEditor");
    });
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
  // Map / Template States

  setMainTemplate: function (templateName) {
    var match = this.templateMappings[templateName];

    if (match) { // Set the main template and corresponding map
      var map = match.map,
          mapState = map.state,
          mapEvent = map.evt;

      if (mappingFsm.state === mapState) {
        Session.set("mainTemplate", templateName);
      } else {
        mappingFsm.transition(mapState);
        mappingFsm.on(mapEvent, function () {
          Session.set("mainTemplate", templateName);
          this.off(mapEvent);
        });      
      }
    } else { // Set main template only
      Session.set("mainTemplate", templateName);
    }
  },

  ////////////////////////
  // Common Functions

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

  runSetActivity: function (groupSlug, activityId, isPermalink, callback) {
    isPermalink = isPermalink || false;
    this.runSetGroup(groupSlug, function () {

      // Now we have a group and either an activity id/slug
      // Subscribe to activityShow and activityComments now but
      // first check whether we already have the activity record
      // and if so, then run the callback method if any was supplied
      // var options = {};
      // if (isPermalink)
      //   options._id = activityId;
      // else
      //   options.slug = activityId;

      logIfDev("Subscribe to activity");

      var group = Groups.findOne({slug: groupSlug});

      activitySubscription = Meteor.subscribe("activityShow", activityId, group._id);
      commentsSubscription = Meteor.subscribe("activityComments", activityId, group._id);

      // The activity record might not be fetched yet if the user has just arrived at the site.
      // Use a deps.autorun to get the group once the record has been received.
      if (ReactiveGroupFilter.get("activity") !== activityId) {
        Deps.autorun( function (computation) {
          

          if (group) {
            var activity = Activities.findOne(_.extend(options, {group: group._id}));

            if (activity) {
              logIfDev("++ Setting activity from router");

              ReactiveGroupFilter.set("activity", activity._id);

              if (_.isFunction(callback))
                callback.call();

              computation.stop(); 
            }
          }
        }); 

      // Just run the callback if set and the activity hasn't changed. This happens when 
      // the user goes from an activity view to the edit view.
      } else if (_.isFunction(callback)) {
        callback.call();
      }
    });
  },

  jumpToTop: function () {
    $('html,body').scrollTop(0);

    return this;
  },

  resetGroup: function () {
    ReactiveGroupFilter.clear();
  }
});

Router = new AppRouter();