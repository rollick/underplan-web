var AppRouter = Backbone.Router.extend({
  routes: {
    "":                               "main",
    "new":                            "newGroup",
    ":groupSlug":                     "group",
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
    // TODO:  for now there is only one group. Later 
    //        this is where we set the group for the session
    Session.set("groupSlug", groupSlug);
    showActivityMap();
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
    showStoryEditor();
  },

  activity: function(groupSlug, activitySlug) {
    showActivity(activitySlug);
  },

  editActivity: function(groupSlug, activitySlug) {
    editActivity(activitySlug);
  },

  setGroupList: function() {
    this.navigate("", true);
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