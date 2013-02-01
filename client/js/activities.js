///////////////////////////////////////////////////////////////////////////////
// Activity actions

Template.activityActions.events({
  'click .new-story': function () {

    Router.setNewActivity(getCurrentGroup());
    return false;
  }
});

Template.activityActions.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};

///////////////////////////////////////////////////////////////////////////////
// Activity editor

Template.page.showStoryEditor = function () {
  return Session.get("showStoryEditor");
};

Template.storyEditor.events({
  'click .cancel': function () {
    Router.setGroup(Session.get("group"));
    return false;
  },
  'click .back': function (event, template) {
    Router.setActivity(getCurrentGroup(), this);
    return false;
  },
  'click .save': function (event, template) {
    var values = getStoryValues(template);

    if (values.groupId && values.title.length && values.text.length) {
      Meteor.call('createActivity', values, function (error, activityId) {
        if (! error) {
          Router.setActivity(getCurrentGroup(), Activities.findOne(activityId));
        }
      });
    } else {
      Session.set("createError",
                  "It needs a title and a story, or why bother?");
    }
  },
  'click .update': function (event, template) {
    var activityId = template.find(".id").value;
    var values = getStoryValues(template);

    if (values.title.length && values.text.length) {
      Activities.update({_id: activityId}, {$set: values});
      Router.setActivity(getCurrentGroup(), Activities.findOne(activityId));
    } else {
      Session.set("createError",
                  "It needs a title and a story, or why bother?");
    }
  },
});

var getStoryValues = function(template) {
  values = {};
  values.title =        template.find(".title").value;
  values.text =         template.find(".text").value;
  values.location =     template.find(".location").value;
  values.published =    template.find(".published").checked;
  values.slug =         template.find(".slug").value;
  values.groupId =      getCurrentGroupId();

  return values;
}

Template.storyEditor.activity = function () {
  return Session.get("selectedActivity");
};

Template.storyEditor.error = function () {
  return Session.get("createError");
};

var hideActivityEditor = function() {
  Session.set("showActivityMap", true);
  Session.set("showStoryEditor", false);
};

///////////////////////////////////////////////////////////////////////////////
// Activity map

Template.page.activityMapVisible = function () {
  return Session.get("showActivityMap");
};

var showActivityMap = function () {
  showTemplate("activityMap");
};

///////////////////////////////////////////////////////////////////////////////
// Activity actions

var showStoryEditor = function (activitySlug) {
  Session.set("selectedActivity", activityBySlug(activitySlug));
  showTemplate("storyEditor");
  Session.set("createError", null);
};

///////////////////////////////////////////////////////////////////////////////
// Activity feed sidebar

Template.activityFeed.events({
  'click .feed li': function (event, template) {
    Router.setActivity(getCurrentGroup(), this);
    return false;
  },
});

Template.activityFeed.anyActivities = function () {
  return Activities.find({group: getCurrentGroupId()}).count() > 0;
};

Template.activityFeed.recentActivities = function () {
  return Activities.find({group: getCurrentGroupId()}, {limit: 15, sort: {created: -1}});
};

Template.activityFeed.typeIs = function (what) {
  return activityType(this) === what;
};

///////////////////////////////////////////////////////////////////////////////
// Activity view

Template.page.showActivity = function () {
  return Session.get("showActivity");
};

Template.currentActivity.activity = function () {
  return Session.get("selectedActivity");
};

Template.currentActivity.anyActivities = function () {
  return Activities.find().count() > 0;
};

Template.currentActivity.creatorName = function () {
  var owner = Meteor.users.findOne(this.owner);
  if (owner._id === Meteor.userId())
    return "me";
  return displayName(owner);
};

Template.currentActivity.canRemove = function () {
  return this.owner === Meteor.userId();
};

Template.currentActivity.canEdit = function () {
  return this.owner === Meteor.userId();
};

Template.currentActivity.events({
  'click .edit': function () {
    Router.setEditActivity(getCurrentGroup(), this);
    return false;
  }
});

var editActivity = function (slug) {
  showStoryEditor(slug);
}

var showActivity = function (activitySlug) {
  Session.set("selectedActivity", activityBySlug(activitySlug));
  showTemplate("currentActivity");

  return false
};

var activityBySlug = function (activitySlug) {
  return Activities.findOne({slug: activitySlug});
};

var showTemplate = function (templateName) {
  var conditions = {
    groupInviteList: "showInviteList", 
    currentActivity: "showActivity", 
    storyEditor: "showStoryEditor", 
    activityMap: "showActivityMap"
  };

  _.each(_.keys(conditions), function(key) {
    if(key === templateName) {
      Session.set(conditions[key], true);
    } else {
      Session.set(conditions[key], false);
    }
  });
};