this.trackCreateComment = function () {
  // TODO: do some server side logging here!
};

this.notifyCommentCreated = function (userId, options) {
  var commentor = Meteor.users.findOne(userId);
  var activity = Activities.findOne(options.activityId);
  var group = Groups.findOne(activity.group);

  var commentorEmails = commentFollowerEmails(options.owner, options.activityId);
  
  var allEmails = _.union(groupMemberEmails(activity.group), commentorEmails);

  if(allEmails.length > 0) {
    var text  =  "Hey, " + displayName(commentor) + " just commented on a " + activity.type; 
    if(activity.type == "story") {
      var url = Meteor.absoluteUrl() + [group.slug, activity.slug].join("/");

      text += " titled '" + activity.title + "'. ";
      text += "Check it out here: " + url + "\n\n"
    } else if(activity.type == "short") {
      var url = Meteor.absoluteUrl() + [group.slug, "pl", activity._id].join("/");

      text += " for the group '" + group.name + "': " + url + "\n\n"
    }

    text += "They said:\n\n" + options.comment + "\n\n";

    if(activity.type == "short")
      text += "To the post:\n\n" + activity.text + "\n\n";

    text += "Yours faithfully, Underplan"

    Email.send({
      from: "noreply@underplan.it",
      bcc: allEmails,
      replyTo: undefined,
      subject: "Underplan: New Comment for '" + group.name + "'",
      text: text
    });
  }
}

// Find all users following the group associated with this comment
// who have also commented on the associated activity
// Pass the owner of the comment so they can be excluded from the
// notification and the activityId to find matching comments / owners
this.commentFollowerEmails = function(owner, activityId) {
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