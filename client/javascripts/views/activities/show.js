///////////////////////////////////////////////////////////////////////////////
// Activity view

Template.currentActivity.events({
  'click a.comments': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    var item = $(event.target).closest(".single-item");
    item.toggleClass("expanded");
    
    if (item.hasClass("expanded")) {
      setFeedCommentsNotice(template);
    } else {
      hideFeedCommentsNotice(item);
    }
  },
  'click .new-comment a': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    if (!!$(event.target).closest("a").hasClass("disabled")) {
      return false;
    }

    var self = this;
    var item = $(event.target).closest(".single-item");
    item.addClass("expanded");

    if (item.hasClass("expanded"))
      setFeedCommentsNotice(template);

    $(template.find("#comment")).focus();
  },
  'click a.action.previous, click a.action.next': function (event, template) {
    event.stopPropagation();
    event.preventDefault();

    Router.setActivity(this);
  }
});

Template.currentActivity.helpers({
  group: function () {
    return Groups.findOne(ReactiveGroupFilter.get("group"));
  },
  activity: function () {
    return Activities.findOne(ReactiveGroupFilter.get("activity"));
  },
  hasMap: function () {
    var activity = Activities.findOne(ReactiveGroupFilter.get("activity"));
    var result = false;

    if (activity) {
      result = activity.lat && activity.lng;
    }

    return result;
  },
  anyActivities: function () {
    return Activities.find().count() > 0;
  },
  textPreview: function () {
    var text = Activities.findOne(ReactiveGroupFilter.get("activity")).text;

    if (!text)
      return "";

    var limit = 240;

    var preview = text.substring(0, limit);
    if(text.length > limit)
      preview += "...";

    return preview;
  },
  anyComments: function () {
    var activity = Activities.findOne(ReactiveGroupFilter.get("activity"));

    return Comments.find({activityId: activity._id}).count() > 0;
  },
  creatorName: function () {
    var owner = Meteor.users.findOne(this.owner);
    if(!owner)
      return "";

    if(owner._id === Meteor.userId())
      return "me";

    return displayName(owner);
  },
  activityCls: function () {
    // FIXME: this is a hack to remove the expanded class when the activity
    //        first loads. If the expanded class when added earlier when the
    //        expanded the comments then it will be preserved by meteor which
    //        is usually nice but not here. Anyway, must be a cleaner way
    //        to do this...
    if (ReactiveGroupFilter.get("activity")) {
      $(".single-item").removeClass("expanded");
    }

    return "";
  }
});

///////////////////////////////////////////////////////////////////////////////
// Activity Controls

Template.activityControls.helpers({
  group: function () {
    return Groups.findOne(this.group);
  },

  nextActivity: function () {
    var ids = Session.get("activityIdsSorted"),
        index = _.indexOf(ids, this._id);

    if (index === ids.length) // at the end
      return null;
    else
      return Activities.findOne(ids[index+1]);
  },

  previousActivity: function () {
    var ids = Session.get("activityIdsSorted"),
        index = _.indexOf(ids, this._id);

    if (index === 0) // at the beginning
      return null;
    else
      return Activities.findOne(ids[index-1]);
  }
});

///////////////////////////////////////////////////////////////////////////////
// Story Content

Template.singleItemContent.helpers(itemHelpers);
Template.singleItemContent.events(itemEvents);
