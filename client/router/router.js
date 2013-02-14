var AppRouter = Backbone.Router.extend({
  routes: {
    "":                               "main",
    "new":                            "newGroup",
    ":groupSlug":                     "group",
    ":groupSlug/settings":            "groupSettings",
    ":groupSlug/new":                 "newActivity",
    ":groupSlug/membership":          "groupMembership",
    ":groupSlug/:activitySlug":       "activity",
    ":groupSlug/:activitySlug/edit":  "editActivity"
  },

  main: function() {
    Session.set("groupSlug", null);
    showGroupList();
  },

  group: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    showActivityMap();
  },

  groupSettings: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    showGroupEditor();
  },

  newGroup: function() {
    showGroupEditor();
  },

  groupMembership: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    showInviteList();
  },

  newActivity: function(groupSlug) {
    Session.set("groupSlug", groupSlug);
    Session.set("activitySlug", null);
    showStoryEditor();
  },

  activity: function(groupSlug, activitySlug) {
    Session.set("groupSlug", groupSlug);
    Session.set("activitySlug", activitySlug);
    showActivity();
  },

  editActivity: function(groupSlug, activitySlug) {
    editActivity();
  },

  setGroupList: function() {
    this.navigate("", true);
  },

  setGroupEditor: function (group) {
    this.navigate(group.slug + "/settings", true);
  },

  setGroupMembership: function(group) {
    this.navigate(group.slug + "/membership", true);
  },

  setNewGroup: function () {
    this.navigate("new", true)
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