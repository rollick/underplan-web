App.Utils.trackCreateComment = function () {
  // TODO: do some server side logging here!
};

App.Utils.notifyCommentCreated = function (userId, options) {
  var commentor = Meteor.users.findOne(userId);
  var activity = Activities.findOne(options.activityId);
  var group = Groups.findOne(activity.group);

  var commentorEmails = App.Utils.commentFollowerEmails(options.owner, options.activityId);
  
  var allEmails = _.union(App.Utils.groupMemberEmails(activity.group), commentorEmails);

  if(allEmails.length > 0) {
    var text  =  "Hey, " + displayName(commentor) + " just commented on a " + activity.type; 
    if(activity.type == "story") {
      var url = Meteor.absoluteUrl() + [group.slug, activity.slug].join("/");

      text += " titled '" + activity.title + "'. ";
      text += "Check it out here: " + url + "<br />"
    } else if(activity.type == "short") {
      var url = Meteor.absoluteUrl() + [group.slug, "pl", activity._id].join("/");

      text += " for the group '" + group.name + "': " + url + "<br />"
    }

    text += "They said:<br />" + options.comment + "<br />";

    if(activity.type == "short")
      text += "To the post:<br />" + activity.text + "<br />";

    var subject = "Underplan: New Comment for '" + group.name + "'";
    App.Utils.sendMail('underplan-comment', allEmails, subject, text);
  }
}

// Find all users following the group associated with this comment
// who have also commented on the associated activity
// Pass the owner of the comment so they can be excluded from the
// notification and the activityId to find matching comments / owners
App.Utils.commentFollowerEmails = function(owner, activityId) {
  var commentorEmail = userEmail(Meteor.users.findOne({_id: owner}));
  var activity = Activities.findOne({_id: activityId});
  var commentorEmails = [];

  Comments.find({activityId: activityId}).forEach( function (comment) {
    var owner = Meteor.users.findOne({_id: comment.owner});
    commentorEmails.push(userEmail(owner));
  });

  var followerEmails = [];
  Meteor.users.find({}).forEach( function (user) {
    if (user.profile) {
      var following = user.profile.followedGroups;
      if(!!following && following[activity.group]) {
        followerEmails.push(userEmail(user));
      }
    }
  });

  // Return the followers who have commented on the associated activity
  // minus the owner of the recent comment
  return _.without(_.intersection(commentorEmails, followerEmails), [commentorEmail]);
};