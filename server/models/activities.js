// Activity Checks
_.extend(App.Utils, {
  checkCreateActivity: function(userId, options) {
    if (! userId)
      throw new Meteor.Error(403, "You must be logged in");

    if (options.type == "story" && Activities.find({slug: options.slug, group: options.groupId}).count() > 0)
      throw new Meteor.Error(403, "Slug is already taken.");

    App.Utils.activityBasicCheck(options);
    
    var group =  Groups.findOne(options.groupId);
    if (! userBelongsToGroup(userId, group._id))
      throw new Meteor.Error(403, "You must be a member of " + group.name);

    if (_.isEmpty(options.text) && _.isEmpty(options.wikipediaId))
      throw new Meteor.Error(413, "It needs a story or Wikipedia page");
  },

  checkUpdateActivity: function(userId, activityId, fields) {
    var activity = Activities.findOne(activityId);

    if (!activity)
      throw new Meteor.Error(404, "Activity could not be found");

    App.Utils.activityBasicCheck(fields);

    var admin = isGroupAdmin(userId, activity.group);

    if (userId !== activity.owner && !admin)
      throw new Meteor.Error(403, "You must be the activity owner");

    // TODO: need to check if the user can move the activity
    if (activity.groupId !== fields.groupId && !admin)
      throw new Meteor.Error(403, "You don't have permission to move this activity");

    var allowed = [
      "title", 
      "text", 
      "groupId",
      "type", 
      "location", 
      "lat", 
      "lng", 
      "city",
      "region",
      "country",
      "mapZoom", 
      "picasaTags", 
      "published", 
      "wikipediaSearch",
      "wikipediaId",
      "slug", 
      "url", 
      "urlType", 
      "created",
      "updated"
    ];

    // Admin can also change ownership
    if (admin)
      allowed.push("owner");

    if (_.difference(_.keys(fields), allowed).length)
      throw new Meteor.Error(403, "You don't have permission to edit this activity");
  },

  trackCreateActivity: function(properties) {
    // TODO: do some server side logging here!
  },

  trackUpdateActivity: function(properties) {
    // TODO: do some server side logging here!
  },

  groupFollowerEmails: function () {
    // extend to do handle sending emails
  },

  notifyActivityEvent: function(userId, activity, action) {
    var owner = Meteor.users.findOne(userId);
    var group = Groups.findOne(activity.groupId);

    var followerEmails = [];
    // Only notify followers if the activity is published
    if(activity.published) {
      followerEmails = this.groupFollowerEmails(activity.groupId);
    }
    
    // Gather the group member emails and followers but remove 
    // the owners email as he/she doesn't need to be notified
    var allEmails = _.without(_.union(App.Utils.groupMemberEmails(activity.group), followerEmails), userEmail(owner));

    if(allEmails.length > 0) {
      // TODO: replace this with a handlebars template!
      // var text = Handlebars.templates["notifyActivityUpdate"];
      // console.log(text);

      var text  =  "Hey, " + displayName(owner) + " just " + action + " a " + activity.type;
      if(activity.type == "story") {
        var url = Meteor.absoluteUrl() + [group.slug, activity.slug].join("/");

        text += " titled '" + activity.title + "'. ";
        text += "Check it out here: " + url + "\n\n"
      } else if(activity.type == "short") {
        var url = Meteor.absoluteUrl() + [group.slug, "pl", activity._id].join("/");

        text += " for the group '" + group.name + "': " + url + "\n\n"
        text += "They wrote:\n\n" + activity.text + "\n\n";
      }

      text += "Yours faithfully, Underplan"

      Email.send({
        from: "noreply@underplan.it",
        bcc: allEmails,
        replyTo: undefined,
        subject: "Underplan: " + (action == "created" ? "New" : "Updated") + " Activity for '" + group.name + "'",
        text: text
      });
    }
  }
});