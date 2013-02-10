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

Template.storyEditor.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.storyEditor.events({
  'keyup .location': function (event, template) {
    var location = template.find(".location").value;
    
    if (typeof google == "object" && typeof google.maps == "object") {
      var geocoder = new google.maps.Geocoder();

      geocoder.geocode( { 'address': location }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          lat = results[0].geometry.location.Ya;
          lng = results[0].geometry.location.Za

          template.find(".location-coords").innerHTML = Math.round(lat*10000)/10000 + ", " + Math.round(lng*10000)/10000 + " (" + results[0].formatted_address + ")";
        } else {
          lat = null;
          lng = null;

          template.find(".location-coords").innerHTML = "No geo match";
        }

        template.find(".lat").value = lat;
        template.find(".lng").value = lng;
      });
    } else {
      template.find(".location-coords").innerHTML = (location == "" ? "" : "Geolocation not available");
    }
  },
  'click .cancel': function (event, template) {
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

var showStoryEditor = function () {
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
  return Activities.findOne(getCurrentActivityId());
};

Template.currentActivity.anyComments = function () {
  return Comments.find({activityId: getCurrentActivityId()}).count() > 0;
};

Template.currentActivity.comments = function () {
  return Comments.find({activityId: getCurrentActivityId()}, {sort: {created: -1}});
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

var editActivity = function () {
  showStoryEditor();
}

var showActivity = function () {
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

///////////////////////////////////////////////////////////////////////////////
// Activity comment

Template.activityComment.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.activityComment.events({
  'click .save': function (event, template) {
    var comment = template.find(".comment").value;
    var activityId = template.find(".activity-id").value;

    if (comment && activityId && Meteor.userId()) {
      Meteor.call('createComment', {comment: comment, activityId: activityId}, function (error, commentId) {
        if (! error) {
          $('#commentModal').trigger('reveal:close');
        }
      });
    } else {
      Session.set("createError",
                  "It needs a comment, or why bother?");
    }
  },
})
