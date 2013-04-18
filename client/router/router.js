var trackRoute = function(eventName, properties) {
  if(typeof mixpanel === "object") {
    if(!!Meteor.userId()) {
      mixpanel.identify(Meteor.userId());

      var user = Meteor.user();
      if (user) { // FIXME: can't always rely on the user data being present
        mixpanel.name_tag(userEmail(user));
        mixpanel.people.set({
          "$name": user.profile.name,
          "$created": (new Date(user.createdAt)).toUTCString()
        });        
      }
    }

    mixpanel.track(eventName, properties);
  } else {
    console.log("Mixpanel not loaded!!");
  }
};

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
    ":groupSlug/new":                 "New Group Loaded",
    ":groupSlug/membership":          "Group Membership Loaded",
    ":groupSlug/:activitySlug":       "Story Loaded",
    ":groupSlug/:activitySlug/edit":  "Story Editor Loaded",
  },

  before: function(route, params) {
    // Shouldn't be any create errors when re-routing
    Session.set("createError", null);

    // Some permission checks:
    // settings only for logged in users
    if(!!route.match(/setting/) && !Meteor.userId()) {
      this.setHome();
      return false;
    }
  },

  after: function(route, params) {
    var label = this.routeLabels[route];
    if(!label)
      label = "Unknown route loaded";

    var path = "/" + route;
    params.forEach( function(part) {
      path = path.replace(/:[a-z|0-9|-]*/i, part);
    });
    trackRoute(label, {route: route, params: params, path: path});
  },

  main: function() {
    resetGroup();
    showTemplate("mainHome");
    this.jumpToTop();
  },

  group: function(groupSlug) {
    this.setGroupDefaults(groupSlug);
    showTemplate("activityMap");
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
    showTemplate("storyEditor");
    this.jumpToTop();
  },

  activity: function(groupSlug, activitySlug) {
    var slugParts = activitySlug.split("?");

    Session.set("groupSlug", groupSlug);
    Session.set("activitySlug", slugParts[0]);
    Session.set("activityImageUrl", null);
    showTemplate("currentActivity");
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
    var groupSlug = Groups.findOne(activity.group).slug;

    this.navigate(groupSlug + "/" + activity.slug, true);
  },

  setNewActivity: function (group) {
    this.navigate(group.slug + "/new", true)
  },

  setGroupDefaults: function (groupSlug) {
    Session.set("groupSlug", groupSlug);
    Session.set("feedFilter", {});
    Session.set("feedLimit", feedLimitSkip);
  },

  jumpToTop: function() {
    $('html,body').scrollTop(0);
  }
});

Router = new AppRouter();