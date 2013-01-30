///////////////////////////////////////////////////////////////////////////////
// Activity actions

Template.activityActions.events({
  'click .new-story': function () {
    showStoryEditor();
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Activity editor

Template.page.showStoryEditor = function () {
  return Session.get("showStoryEditor");
};

Template.storyEditor.events({
  'click .cancel': function () {
    Session.set("showActivityMap", true);
    Session.set("showStoryEditor", false);
    return false;
  },
  'click .back': function (event, template) {
    showActivity(this._id);
    return false;
  },
  'click .save': function (event, template) {
    var values = getStoryValues(template);

    if (values.title.length && values.text.length) {
      Meteor.call('createActivity', values, function (error, activity) {
        if (! error) {
          Session.set("selectedActivity", activity);
        }
      });
      hideActivityEditor();
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
      hideActivityEditor();
    } else {
      Session.set("createError",
                  "It needs a title and a story, or why bother?");
    }
  },
});

var getStoryValues = function(template) {
  values = {};
  values.title =       template.find(".title").value;
  values.text =        template.find(".text").value;
  values.location =    template.find(".location").value;
  values.published =   template.find(".published").checked;
  values.slug =        template.find(".slug").value;

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
  Session.set("showActivityMap", true);
  Session.set("showStoryEditor", false);
  Session.set("showActivity", false);
};

///////////////////////////////////////////////////////////////////////////////
// Activity actions

var showStoryEditor = function (activitySlug) {
  Session.set("selectedActivity", activityBySlug(activitySlug));
  Session.set("showActivity", false);
  Session.set("showActivityMap", false);
  Session.set("createError", null);
  Session.set("showStoryEditor", true);
};

///////////////////////////////////////////////////////////////////////////////
// Activity feed sidebar

Template.activityFeed.events({
  'click .feed li': function (event, template) {
    Router.setActivity(Session.get("group"), this);
    // showActivity(this._id);
    return false;
  },
});

Template.activityFeed.recentActivities = function () {
  return Activities.find({}, {limit: 15, sort: {created: -1}});
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
    Router.setEditActivity(Session.get("group"), this);
    return false;
  }
});

var editActivity = function (slug) {
  showStoryEditor(slug);
}

var showActivity = function (activitySlug) {
  Session.set("selectedActivity", activityBySlug(activitySlug));
  Session.set("showActivityMap", false);
  Session.set("showStoryEditor", false);
  Session.set("showActivity", true);

  return false
};

var activityBySlug = function (activitySlug) {
  return Activities.findOne({slug: activitySlug});
}