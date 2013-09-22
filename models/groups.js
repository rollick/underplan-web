///////////////////////////////////////////////////////////////////////////////
// Groups

/*
  Groups are a top level container for models like Activities. Eventually they will include
  membership and access control (for posting, editing etc) based on this membership.
*/

Groups = new Meteor.Collection("groups");

Groups.allow({
  insert: function (userId, group) {
    return false; // no cowboy inserts -- use createGroup method
  },
  update: function (userId, group, fields, modifier) {
    return canUpdateGroup(userId, group, fields);
  },
  remove: function (userId, groups) {
    return ! _.any(groups, function (group) {
      // deny if not the owner
      return group.owner !== userId;
    });
  }
});

Meteor.methods({
  // options should include: name
  createGroup: function (options) {
    check(options, Object);

    if ( typeof options.created === "undefined" )
      options.created = new Date();

    if ( typeof options.slug === "undefined" || options.slug == "" )
      options.slug = createLinkSlug(options.name);

    var approved = false // unapproved by default. Admins can approve
    var owner = Meteor.users.findOne({_id: this.userId});
    if (owner.admin) {
      approved = true;
    }
    options.approved = approved;

    checkGroupCreate(this.userId, options);

    var groupId = Groups.insert({
      owner:            this.userId,
      name:             options.name,
      description:      options.description,
      trovebox:         options.trovebox,
      picasaUsername:   options.picasaUsername,
      picasaAlbum:      options.picasaAlbum,
      picasaKey:        options.picasaKey,
      created:          options.created,
      slug:             options.slug,
      invited:          [],
      rsvps:            [],
      approved:         options.approved
    });

    trackCreateGroup(groupId);

    return groupId;
  },

  invite: function (groupId, userId) {
    check(groupId, String);
    check(userId, String);

    var group = Groups.findOne(groupId);
    if (! group || group.owner !== this.userId)
      throw new Meteor.Error(404, "No such group");

    if (userId !== group.owner && ! _.contains(group.invited, userId)) {
      Groups.update(groupId, { $addToSet: { invited: userId } });

      var from = userEmail(Meteor.users.findOne(this.userId));
      var to = userEmail(Meteor.users.findOne(userId));
      if (Meteor.isServer && to) {
        Email.send({
          from: "noreply@underplan.it",
          to: to,
          replyTo: from || undefined,
          subject: "Underplan: " + group.name,
          text:
"Hey, I just invited you to '" + group.name + "' on Underplan." +
"\n\nCome check it out: " + Meteor.absoluteUrl() + "/" + group.slug + "\n"
        });
      }
    }
  },

  rsvp: function (groupId, rsvp) {
    check(groupId, String);
    check(rsvp, String);

    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");
    if (! _.contains(['yes', 'no'], rsvp))
      throw new Meteor.Error(400, "Invalid RSVP");
    var group = Groups.findOne(groupId);
    if (! group)
      throw new Meteor.Error(404, "No such group");
    if (group.owner !== this.userId && !_.contains(group.invited, this.userId))
      throw new Meteor.Error(403, "No must be invited");

    var rsvpIndex = _.indexOf(_.pluck(group.rsvps, 'user'), this.userId);
    if (rsvpIndex !== -1) {
      // update existing rsvp entry

      if (Meteor.isServer) {
        // update the appropriate rsvp entry with $
        Groups.update(
          {_id: groupId, "rsvps.user": this.userId},
          {$set: {"rsvps.$.rsvp": rsvp}});
      } else {
        // minimongo doesn't yet support $ in modifier. as a temporary
        // workaround, make a modifier that uses an index. this is
        // safe on the client since there's only one thread.
        var modifier = {$set: {}};
        modifier.$set["rsvps." + rsvpIndex + ".rsvp"] = rsvp;
        Groups.update(groupId, modifier);
      }
    } else {
      // add new rsvp entry
      Groups.update(groupId,
                     {$push: {rsvps: {user: this.userId, rsvp: rsvp}}});
    }
  }
});

this.groupCountries = function (groupId) {
    var countries = [];

  Activities.find({group: groupId}).forEach( function(activity) {
    if(typeof activity.country === "string" && activity.country.length) {
      countries.push(activity.country);
    }
  });

  return _.uniq(countries).sort();
}

var checkGroupCreate = function(userId, options) {
  if (! userId)
    throw new Meteor.Error(403, "You must be logged in");

  if (typeof options.name === "string" && options.name.length > 100)
    throw new Meteor.Error(413, "Name too long");

  if (typeof options.description === "string" && options.description.length > 100)
    throw new Meteor.Error(413, "Description too long");

  if (typeof options.approved === true && !isSystemAdmin(userId))
    throw new Meteor.Error(413, "You can't approve a group");
};

if (Meteor.isClient) {
  var trackCreateGroup = function (groupId) {
    check(groupId, String);

    var groupName = Groups.findOne(groupId, {$fields: {name: 1}}).name;
    trackEvent("Group Created", {"Group ID": groupId, "Group Name": groupName});
  };  
}

if (Meteor.isServer) {
  var trackCreateGroup = function () {
    // TODO: do some server side logging here!
  };

  var canUpdateGroup = function(userId, group, fields) {
    var sysAdmin = isSystemAdmin(userId);
    
    if ( !(sysAdmin || userId === group.owner))
      return false; // not the owner or admin

    var allowed = ["name", "description", "trovebox", "picasaUsername", "picasaAlbum", "picasaKey"];

    if (sysAdmin)
      allowed.push("approved", "owner");

    if (_.difference(fields, allowed).length)
      return false; // tried to write to forbidden field

    return true;
  }
}