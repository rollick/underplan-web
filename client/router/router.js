var AppRouter = Backbone.Router.extend({
  routes: {
    "":                               "main",
    "new":                            "newGroup",
    ":groupSlug":                     "group",
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

  activity: function(groupId, activitySlug) {
    showActivity(activitySlug);
  },

  editActivity: function(groupId, activitySlug) {
    editActivity(activitySlug);
  },

  setGroupList: function() {
    this.navigate("", true);
  },

  setNewGroup: function () {
    this.navigate("new", true)
  },

  setGroup: function(group) {
    if (typeof group === "undefined") {
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
  }

});

Router = new AppRouter();