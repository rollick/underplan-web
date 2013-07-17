///////////////////////////////////////////////////////////////////////////////
// Activity view

Template.currentActivity.helpers({
  gallery: function () {
    var group = Groups.findOne(Session.get("groupId"));
    var activity = Activities.findOne(Session.get("activityId"));
    var params = {};
    var element = ".activity-highlight";

    if (_.isString(group.picasaKey) && group.picasaKey.length)
      params.authkey = group.picasaKey

    if (_.isString(activity.picasaTags) && activity.picasaTags.length)
      params.tag = activity.picasaTags;

    picasa.setOptions({max: 99}); // Note: Hope there isn't more in this story...
    picasa.useralbum(group.picasaUsername, group.picasaAlbum, params, function(data) {
        Galleria.run(element, {
            dataSource: data,
            showInfo: true
        });
    });

    return new Handlebars.SafeString("<p class=\"alert-box\">Loading photos...</p>");
  }
});

Template.currentActivity.events({
  'click .edit': function () {
    Router.setEditActivity(Session.get("groupId"), this);
    return false;
  },
  'click .new-comment a': function (event, template) {
    Session.set("createError", null);
    
    $(event.target).closest("a").toggleClass("disabled");
    $(".comment-form.row").toggle();
    return false;
  },
  'click .activity-controls a': function (event, template) {
    Router.setActivity(this);
    return false;
  }
});

Template.currentActivity.nextActivity = function () {
  var activity = Activities.findOne(Session.get("activityId"));

  return Activities.find({
    $and: [
      {group: Session.get("groupId")},
      {"_id": {"$not": Session.get("activityId")}}, 
      {type: "story"}, 
      {created: {"$gte": activity.created}}
    ]
  }, {sort: {created: 1, _id: 1}}).fetch()[0];
};

Template.currentActivity.previousActivity = function () {
  var activity = Activities.findOne(Session.get("activityId"));

  return Activities.find({
    $and: [
      {group: Session.get("groupId")},
      {"_id": {"$not": Session.get("activityId")}}, 
      {type: "story"}, 
      {created: {"$lte": activity.created}}
    ]
  }, {sort: {created: -1, _id: -1}}).fetch()[0];
};

Template.currentActivity.dateCreated = function () {
  debugger
  return formattedDate(this.created);
};

Template.currentActivity.group = function () {
  return Groups.findOne(Session.get("groupId"));
};

Template.currentActivity.activity = function () {
  return Activities.findOne(Session.get("activityId"));
};

Template.currentActivity.hasPhotos = function () {
  return currentActivityHasPhotos();
};

Template.currentActivity.hasMap = function () {
  return currentActivityHasMap();
};

// If the story has a short description and photos to show then return true
// Used to alter layout in template for photo-centered view
Template.currentActivity.photoShow = function () {
  var activity = this;

  if (activity.text.length < shortMaxLength && !_.isEmpty(activity.picasaTags)) {
    return true;
  }

  return false;
};

Template.currentActivity.anyActivities = function () {
  return Activities.find().count() > 0;
};

Template.currentActivity.textPreview = function () {
  var text = Activities.findOne(Session.get("activityId")).text;
  var limit = 240;

  var preview = text.substring(0, limit);
  if(text.length > limit)
    preview += "...";

  return preview;
};

Template.currentActivity.anyComments = function () {
  var activity = Activities.findOne(Session.get("activityId"));

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

Template.currentActivity.canRemove = function () {
  return (this.owner === Meteor.userId() || isGroupAdmin(Meteor.userId(), getCurrentGroupId()));
};

Template.currentActivity.canEdit = function () {
  return (this.owner === Meteor.userId() || isGroupAdmin(Meteor.userId(), getCurrentGroupId()));
};

Template.currentActivity.facebookShareUrl = function () {
  if(Session.get("groupId") && Session.get("activityId")) {
    var activity = Activities.findOne(Session.get("activityId"));
    var group = Groups.findOne(Session.get("groupId"));

    if(activity && group) {
      var activityUrl = Meteor.absoluteUrl() + [group.slug, activity.slug].join("/");
      var link = "https://www.facebook.com/dialog/feed?app_id=:appId&link=:activityUrl&name=:activityTitle&description=:activityPreview&redirect_uri=:activityUrl";

      link = link.replace(/:appId/, Meteor.settings.public.fbAppId).
           replace(/:activityUrl/g, encodeURIComponent(activityUrl)).
           replace(/:activityTitle/g, encodeURIComponent(activity.title)).
           replace(/:activityPreview/g, encodeURIComponent(Template.currentActivity.textPreview()));

      // FIXME: work out how to show map in share post if no image available
      var imageUrl = Session.get("activityImageUrl");
      // var mapUrl = Session.get("activityMapUrl");
      if (!!imageUrl) {
        link += "&picture=" + encodeURIComponent(imageUrl);
      // } else if (!!mapUrl) {
      //   link += "&picture=" + encodeURIComponent(mapUrl); 
      }

      if (!!activity.country && !!activity.city) {
        link += "&caption=" + encodeURIComponent(activity.city + ", " + activity.country);
      }

      return link;
    }
  }

  return "#";
}

Template.currentActivity.created = function() {
  ///////////////////////
  // Share this on Google+
  window.___gcfg = {lang: 'en-GB'};

  (function() {
    var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
    po.src = 'https://apis.google.com/js/plusone.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
  })();
};


Template.currentActivity.destroyed = function () {
  var gallery = Galleria.get(0);
  if (_.isObject(gallery))
    gallery.destroy();
}