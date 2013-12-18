var AppRouter = Backbone.Router.extend({
  routes: {
    "":                               "main",
    "new":                            "newGroup",
    "user/settings":                  "userSettings",
    "settings":                       "mainSettings",
    ":groupSlug":                     "group",
    ":groupSlug/c/:country":          "groupAndCountry",
    ":groupSlug/settings":            "groupSettings",
    ":groupSlug/feed":                "groupFeed",
    ":groupSlug/new":                 "newStory",
    ":groupSlug/new/shorty":          "newShorty",
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
    ":groupSlug/c/:country":          "Group Loaded By Country",
    ":groupSlug/settings":            "Group Settings Loaded",
    ":groupSlug/new":                 "New Story Loaded",
    ":groupSlug/new-s":               "New Shorty Loaded",
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
    storyEditor: {
      map: {
        evt: "ActivityMapReady",
        state: "showActivity"        
      }
    },
    storyCreator: {
      map: {
        evt: "LocationCreatorReady",
        state: "showLocationCreator"        
      }
    },
    shortyEditor: {
      map: {
        evt: "EditorMapReady",
        state: "showEditor"
      }
    },
    activityFeed: {
      map: {
        evt: "FeedMapReady",
        state: "recentFeed"        
      }
    },
  },

  before: function(route, params) {
    // Clear the mainTemplate
    this.mainTemplate = null;

    this.currentDepsAutorun = null;

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

  currentDepsAutorun: null,

  ////////////////////////
  // Main Routing Functions

  main: function() {
    ReactiveGroupFilter.clearGroup();

    this.setAndLoadMainTemplate("mainHome");
  },

  group: function(groupSlug) {
    this.runSetGroup(groupSlug);
    ReactiveGroupFilter.set("country", null);

    this.setAndLoadMainTemplate("groupMain");
  },

  groupAndCountry: function(groupSlug, country) {
    this.runSetGroup(groupSlug);

    if (country) {
      country = encodeURIComponent(country).replace("-", " ");
      ReactiveGroupFilter.set("country", country);
    }

    this.setAndLoadMainTemplate("groupMain");
  },

  mainSettings: function() {
    this.setAndLoadMainTemplate("mainSettings");
  },

  groupSettings: function(groupSlug) {
    this.runSetGroup(groupSlug);

    this.setAndLoadMainTemplate("mainSettings");
  },

  groupFeed: function(groupSlug) {
    this.runSetGroup(groupSlug);

    this.setAndLoadMainTemplate("activityFeed");
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

  newStory: function(groupSlug) {
    this.runSetGroup(groupSlug);
    ReactiveGroupFilter.set("activity", null);

    this.jumpToTop().setAndLoadMainTemplate("storyCreator");
  },

  activity: function(groupSlug, activitySlug) {
    var parts = activitySlug.split("?"),
        self = this;

    this.runSetStoryActivity(groupSlug, parts[0]);
  },

  newShorty: function(groupSlug) {
    this.runSetGroup(groupSlug);
    ReactiveGroupFilter.set("activity", null);

    this.jumpToTop().setAndLoadMainTemplate("shortyEditor");
  },

  permaActivity: function(groupSlug, activityId) {
    var parts = activityId.split("?"),
        self = this;

    this.runSetActivity(groupSlug, parts[0], true).setAndLoadMainTemplate("currentActivity");
  },

  editActivity: function(groupSlug, activitySlug) {
    var parts = activitySlug.split("?"),
        self = this;

    this.runSetStoryActivity(groupSlug, parts[0], true);
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

  setGroupAndCountry: function(group, country) {
    if (!group || typeof group === "undefined") {
      this.navigate("", true);
    } else {
      // replace spaces with hyphens
      country = encodeURIComponent(country.replace(/\s/, "-"));
      this.navigate(group.slug + "/c/" + country, true);
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

  setNewShorty: function (group) {
    this.navigate(group.slug + "/new/shorty", true)
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
        mappingFsm.on(mapEvent, function () {
          Session.set("mainTemplate", templateName);
          this.off(mapEvent);
        });
        mappingFsm.transition(mapState);
      }
    } else { // Set main template only
      Session.set("mainTemplate", templateName);
    }
  },

  ////////////////////////
  // Common Functions

  runSetGroup: function (groupSlug, clearActivity) {
    ReactiveGroupFilter.set("groupSlug", groupSlug);
    ReactiveGroupFilter.set("limit", 5);
    
    Deps.autorun( function (computation) {
      var group = Groups.findOne({slug: ReactiveGroupFilter.get("groupSlug")});

      if (group) {
        ReactiveGroupFilter.set("group", group._id);
        computation.stop();
      }
    });

    Session.set("expandedActivities", []);

    // Clear activity??
    if (_.isUndefined(clearActivity) || clearActivity) {
      // FIXME: there is probably a timing issue here as the slug would need to be cleared 
      //        before the activity otherwise the autorun in Meteor.startup will reload
      //        the activity if the slug is set but the activity is null. :-( Maybe we should 
      //        have a "clearActivity" function on the ReactiveGroupFilter which clears both
      //        and then triggers any reactive dependencies. Ah, there is a 'quiet' option when
      //        setting the a property on ReactiveGroupFilter. Will use that below for now...
      ReactiveGroupFilter.set("activitySlug", null, {quiet: true});
      ReactiveGroupFilter.set("activity", null);
    }

    return this;
  },

  runSetActivity: function (groupSlug, activityId, isPermalink, callback) {
    // Set group but don't clear activity/activitySlug as any change to them is handled next
    this.runSetGroup(groupSlug, false);

    if (isPermalink) {
      ReactiveGroupFilter.set('activitySlug', null);
      ReactiveGroupFilter.set('activity', activityId);
    } else {
      ReactiveGroupFilter.set('activity', null);
      ReactiveGroupFilter.set('activitySlug', activityId);
    }

    return this;
  },

  // A story is a little different to setup because the activity id is not know until
  // it is fetched based on the slug. So we get things running based using runSetActivity
  // and then watch until the activity has been set before transitioning
  runSetStoryActivity: function (groupSlug, activityId, showEditor) {
    var self = this;

    this.runSetActivity(groupSlug, activityId, false);

    // We need this in a deps to ensure that the activity has been set based on 
    // the slug before transitioning the map state as the map uses the activity id
    // to find the correct map marker
    this.currentDepsAutorun = Deps.autorun( function (computation) {
      if (ReactiveGroupFilter.get("activity")) {
        if (showEditor) {
          self.setAndLoadMainTemplate("storyEditor");  
        } else {
          self.setAndLoadMainTemplate("currentActivity");
        }

        // Once we know the activity has been set we can stop future runs
        computation.stop();
      }
    });
  },

  jumpToTop: function () {
    $('html,body').scrollTop(0);

    return this;
  }
});

Router = new AppRouter();