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

  main: function() {
    resetGroup();
    showTemplate("mainHome");
    this.jumpToTop();
  },

  group: function(groupSlug) {
    // Only reset the defaults if the group has changed
    if (Session.get("groupSlug") !== groupSlug) {
      this.setGroupDefaults(groupSlug);
    }

    showTemplate("activityFeed");
    this.jumpToTop();
  },

  mainSettings: function() {
    showTemplate("mainSettings");
  },

  groupSettings: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    showTemplate("mainSettings");
  },

  newGroup: function() {
    showTemplate("groupEditor");
    this.jumpToTop();
  },

  userSettings: function() {
    showTemplate("userSettings");
    this.jumpToTop();
  },

  groupMembership: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    showTemplate("groupInviteList");
  },

  newActivity: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    Session.set("activitySlug", null);
    Session.set("activityId", null);
    showTemplate("storyEditor");
    this.jumpToTop();
  },

  activity: function(groupSlug, activitySlug) {
    var slugParts = activitySlug.split("?");

    Session.set("groupSlug", groupSlug);
    Session.set("activitySlug", slugParts[0]);
    Session.set("activityId", null);
    Session.set("activityImageUrl", null);
    showTemplate("currentActivity");
    this.jumpToTop();
  },

  permaActivity: function(groupSlug, activityId) {
    var slugParts = activityId.split("?");

    Session.set("groupSlug", groupSlug);
    Session.set("activityId", slugParts[0]);
    Session.set("activitySlug", null);
    Session.set("activityImageUrl", null);
    showTemplate("permaShorty");
    this.jumpToTop();
  },

  editActivity: function(groupSlug, activitySlug) {
    Session.set("groupSlug", groupSlug);
    Session.set("activitySlug", activitySlug);
    showTemplate("storyEditor");
    this.jumpToTop();
  },

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

  setEditActivity: function(group, activity) {
    // TODO:  should just pass activity here and then use it's slug and the
    //        associated groups slug to generate url
    this.navigate(group.slug + "/" + activity.slug + "/edit", true);
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

  setGroupDefaults: function (groupSlug) {
    logIfDev("FeedFilter set here (4)");

    Session.set("groupSlug", groupSlug);
    ReactiveFeedFilter.clear();
    ReactiveFeedFilter.set("limit", feedLimitSkip);
    Session.set("galleryLimit", galleryLimitSkip);
    Session.set("expandedActivities", []);
  },

  jumpToTop: function() {
    $('html,body').scrollTop(0);
  }
});

Router = new AppRouter();