///////////////////////////////////////////////////////////////////////////////
// Activity view

Template.currentActivity.events({
  'click .edit': function () {
    Router.setEditActivity(Session.get("groupId"), this);
    return false;
  },
  'click a.comments': function (event, template) {
    var item = $(event.target).closest(".feed-item");
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
    var item = $(event.target).closest(".feed-item");
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

Template.currentActivity.group = function () {
  return Groups.findOne(Session.get("groupId"));
};

Template.currentActivity.activity = function () {
  return Activities.findOne(Session.get("activityId"));
};

Template.currentActivity.hasMap = function () {
  return currentActivityHasMap();
};

Template.currentActivity.anyActivities = function () {
  return Activities.find().count() > 0;
};

Template.currentActivity.textPreview = function () {
  var text = Activities.findOne(Session.get("activityId")).text;

  if (!text)
    return "";

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

Template.currentActivity.canEdit = function () {
  return (this.owner === Meteor.userId() || isGroupAdmin(Meteor.userId(), getCurrentGroupId()));
};

///////////////////////////////////////////////////////////////////////////////
// Story Content

// If the story has a short description and photos to show then return true
// Used to alter layout in template for photo-centered view

Template.storyContent.helpers({
  gallery: function () {
    var group = Groups.findOne(Session.get("groupId"));
    var activity = Activities.findOne(Session.get("activityId"));
    var element = ".activity-highlight";

    if (_.isObject(group.trovebox)) {
      var params = $.extend({}, group.trovebox);

      // Need to change field name for tags to something like photoTags
      if (_.isString(activity.picasaTags) && activity.picasaTags.length)
        params.tags = activity.picasaTags;

      trovebox.albumSearch(params, function(data) {
        Galleria.run(element, {
          dataSource: data,
          showInfo: true,
          thumbnails: false,
          debug: isDev(),
          extend: function(options) {
            // this.$('thumbnails').hide();
          }
        });
      });            
      
    } else if (group.picasaUsername) {
      var params = {};

      if (_.isString(group.picasaKey) && group.picasaKey.length)
        params.authkey = group.picasaKey

      if (_.isString(activity.picasaTags) && activity.picasaTags.length)
        params.tag = activity.picasaTags;

      // Note: Hope there isn't more in this story...
      picasa.setOptions({
        max: 99
      }).useralbum(group.picasaUsername, group.picasaAlbum, params, function(data) {
        Galleria.run(element, {
          dataSource: data,
          debug: isDev(),
          showInfo: true
        });
      });
    }

    return new Handlebars.SafeString("<p class=\"alert-box clear\">Loading photos...</p>");
  }
});

Template.storyContent.canRemove = function () {
  return (this.owner === Meteor.userId() || isGroupAdmin(Meteor.userId(), getCurrentGroupId()));
};

Template.storyContent.facebookShareUrl = function () {
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

Template.storyContent.created = function() {
  ///////////////////////
  // Share this on Google+
  window.___gcfg = {lang: 'en-GB'};

  (function() {
    var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
    po.src = 'https://apis.google.com/js/plusone.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
  })();
};

Template.storyContent.destroyed = function () {
  if (Galleria.length)
    Galleria.get(0).destroy();
}

Template.storyContent.hasPhotos = function () {
  return currentActivityHasPhotos();
};

Template.storyContent.dateCreated = function () {
  return formattedDate(this.created);
};

Template.storyContent.photoShow = function () {
  var activity = this;

  if (!activity.text)
    return false;

  if (activity.text.length < shortMaxLength && !_.isEmpty(activity.picasaTags)) {
    return true;
  }

  return false;
};