var AppRouter = Backbone.Router.extend({
  routes: {
    "":                               "main",
    "new":                            "newGroup",
    "user/settings":                  "userSettings",
    ":groupSlug":                     "group",
    ":groupSlug/settings":            "groupSettings",
    ":groupSlug/new":                 "newActivity",
    ":groupSlug/membership":          "groupMembership",
    ":groupSlug/:activitySlug":       "activity",
    ":groupSlug/:activitySlug/edit":  "editActivity",
  },

  main: function() {
    resetGroup();
    showTemplate("mainHome");
  },

  group: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    showTemplate("activityMap");
  },

  groupSettings: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    Session.set("createError", null);
    showTemplate("groupEditor");
  },

  newGroup: function() {
    Session.set("createError", null);
    showTemplate("groupEditor");
  },

  userSettings: function() {
    showTemplate("userSettings");
  },

  groupMembership: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    showTemplate("groupInviteList");
  },

  newActivity: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    Session.set("activitySlug", null);
    Session.set("createError", null);
    showTemplate("storyEditor");
  },

  activity: function(groupSlug, activitySlug) {
    Session.set("groupSlug", groupSlug);
    Session.set("activitySlug", activitySlug);
    showTemplate("currentActivity");
  },

  editActivity: function(groupSlug, activitySlug) {
    Session.set("groupSlug", groupSlug);
    Session.set("activitySlug", activitySlug);
    Session.set("createError", null);
    showTemplate("storyEditor");
  },

  setHome: function() {
    this.navigate("", true);
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

  setActivity: function(group, activity) {
    // TODO:  should just pass activity here and then use it's slug and the
    //        associated groups slug to generate url
    this.navigate(group.slug + "/" + activity.slug, true);
  },

  setNewActivity: function (group) {
    this.navigate(group.slug + "/new", true)
  },

});

Router = new AppRouter();