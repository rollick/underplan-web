///////////////////////////////////////////////////////////////////////////////
// Activity view

Template.currentActivity.events({
  'click .edit': function () {
    Router.setEditActivity(this);
    return false;
  },
  'click a.comments': function (event, template) {
    var item = $(event.target).closest(".single-item");
    item.toggleClass("expanded");
    
    if (item.hasClass("expanded")) {
      setFeedCommentsNotice(template);
    } else {
      hideFeedCommentsNotice(item);
    }

    return false;
  },
  'click .new-comment a': function (event, template) {
    if (!!$(event.target).closest("a").hasClass("disabled")) {
      return false;
    }

    var self = this;
    var item = $(event.target).closest(".single-item");
    item.addClass("expanded");

    if (item.hasClass("expanded"))
      setFeedCommentsNotice(template);

    $("#" + self._id + " #comment").focus();

    return false;
  },
  'click .activity-controls a': function (event, template) {
    Router.setActivity(this);
    return false;
  }
});

Template.currentActivity.group = function () {
  return Groups.findOne(ReactiveGroupFilter.get("group"));
};

Template.currentActivity.activity = function () {
  return Activities.findOne(ReactiveGroupFilter.get("activity"));
};

Template.currentActivity.hasMap = function () {
  return currentActivityHasMap();
};

Template.currentActivity.anyActivities = function () {
  return Activities.find().count() > 0;
};

Template.currentActivity.textPreview = function () {
  var text = Activities.findOne(ReactiveGroupFilter.get("activity")).text;

  if (!text)
    return "";

  var limit = 240;

  var preview = text.substring(0, limit);
  if(text.length > limit)
    preview += "...";

  return preview;
};

Template.currentActivity.anyComments = function () {
  var activity = Activities.findOne(ReactiveGroupFilter.get("activity"));

  return Comments.find({activityId: activity._id}).count() > 0;
};

Template.currentActivity.creatorName = function () {
  var owner = Meteor.users.findOne(this.owner);
  if(!owner)
    return "";

  if(owner._id === Meteor.userId())
    return "me";

  return displayName(owner);
};

///////////////////////////////////////////////////////////////////////////////
// Activity Controls

Template.activityControls.group = function () {
  return Groups.findOne(this.group);
};

Template.activityControls.nextActivity = function () {
  var activity = Activities.findOne(this._id);
  var country = ReactiveGroupFilter.get("country");
  var params = {
    $and: [
      {group: ReactiveGroupFilter.get("group")},
      {"_id": {"$not": ReactiveGroupFilter.get("activity")}},
      {"type": "story"}, 
      {_id: {"$gte": activity._id}}
    ]};

  if (country)
    params['$and'].push({"country": country});

  return Activities.find(params, {sort: {_id: 1}}).fetch()[0];
};

Template.activityControls.previousActivity = function () {
  var activity = Activities.findOne(this._id);
  var country = ReactiveGroupFilter.get("country");
  var params = {
    $and: [
      {group: ReactiveGroupFilter.get("group")},
      {"_id": {"$not": ReactiveGroupFilter.get("activity")}}, 
      {"type": "story"}, 
      {_id: {"$lte": activity._id}}
    ]};

  if (country)
    params['$and'].push({"country": country});

  return Activities.find(params, {sort: {_id: -1}}).fetch()[0];
};

///////////////////////////////////////////////////////////////////////////////
// Story Content

// If the story has a short description and photos to show then return true
// Used to alter layout in template for photo-centered view

Template.singleItemContent.helpers(itemHelpers);

Template.singleItemContent.created = function() {
  ///////////////////////
  // Share this on Google+
  window.___gcfg = {lang: 'en-GB'};

  (function() {
    var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
    po.src = 'https://apis.google.com/js/plusone.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
  })();
};

Template.singleItemContent.destroyed = function () {
  if (Galleria.length)
    Galleria.get(0).destroy();
}