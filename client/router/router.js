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

  ////
  // Usage:
  //   Set this with setMainTemplate and then call loadMainTemplate
  //   Call setAndLoadMainTemplate and pass the template name
  _mainTemplateName: null,

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
    // Clear the mainTemplate
    this.mainTemplate = null;

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

    this.setAndLoadMainTemplate("mainHome");
  },

  group: function(groupSlug) {
    this.runSetGroup(groupSlug);

    this.setAndLoadMainTemplate("groupMain");
  },

  mainSettings: function() {
    this.setAndLoadMainTemplate("mainSettings");
  },

  groupSettings: function(groupSlug) {
    this.runSetGroup(groupSlug);

    this.setAndLoadMainTemplate("mainSettings");
  },

  newGroup: function() {
    this.setAndLoadMainTemplate("groupEditor");
    
    this.jumpToTop();
  },

  userSettings: function() {
    this.setAndLoadMainTemplate("userSettings");

    this.jumpToTop();
  },

  groupMembership: function(groupSlug) {
    this.runSetGroup(groupSlug);

    this.setAndLoadMainTemplate("groupInviteList");
  },

  newActivity: function(groupSlug) {
    this.runSetGroup(groupSlug);
    ReactiveGroupFilter.set("activity", null);

    this.jumpToTop().setAndLoadMainTemplate("storyEditor");
  },

  activity: function(groupSlug, activitySlug) {
    var parts = activitySlug.split("?"),
        self = this;

    this.runSetActivity(groupSlug, parts[0], null).setAndLoadMainTemplate("currentActivity");
  },

  permaActivity: function(groupSlug, activityId) {
    var parts = activityId.split("?"),
        self = this;

    this.runSetActivity(groupSlug, parts[0], true).setAndLoadMainTemplate("currentActivity");
  },

  editActivity: function(groupSlug, activitySlug) {
    var parts = activitySlug.split("?"),
        self = this;

    this.runSetActivity(groupSlug, parts[0], true).setAndLoadMainTemplate("storyEditor");
  },

  editShortActivity: function(groupSlug, activityId) {
    var parts = activityId.split("?"),
        self = this;

    this.runSetActivity(groupSlug, parts[0], true).setAndLoadMainTemplate("shortyEditor");
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

  setMainTemplateName: function (templateName) {
    this._mainTemplateName = templateName;

    return this;
  },

  setAndLoadMainTemplate: function (templateName) {
    this.setMainTemplateName(templateName).loadMainTemplate();
  },

  loadMainTemplate: function () {
    if (!this._mainTemplateName)
      return;

    var match = this.templateMappings[this._mainTemplateName],
        templateName = this._mainTemplateName;

    if (match) { // Set the main template and corresponding map
      var map = match.map,
          mapState = map.state,
          mapEvent = map.evt;

      // If the map state won't change then just set the 
      // the new main template
      if (mappingFsm.state === mapState) {
        Session.set("mainTemplate", templateName);
      } else {
        // Set the map and then the main template when the map 
        // transition has finished
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
    Session.set("expandedActivities", []);
    ReactiveGroupFilter.set("groupSlug", groupSlug);
    
    return this;
  },

  runSetActivity: function (groupSlug, activityId, isPermalink, callback) {
    if (isPermalink) {
      ReactiveGroupFilter.set('activity', activityId);
      ReactiveGroupFilter.set('activitySlug', null);
    } else {
      ReactiveGroupFilter.set('activitySlug', activityId);
      ReactiveGroupFilter.set('activity', null);
    }

    this.runSetGroup(groupSlug);

    return this;
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