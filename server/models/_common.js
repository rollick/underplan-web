App.Utils.sendMail = function (templateName, bcc, subject, htmlText) {
  // This uses the API interface for Mandrill
  emails = _.map(_.compact(bcc), function (email) {
    return {
      email: email,
      type: 'bcc'
    }
  });

  if (!emails.length) return;

  Meteor.Mandrill.sendTemplate({
    key: process.env.MANDRILL_API_KEY,
    template_name: templateName,
    template_content: [
      {
        name: 'body',
        content: htmlText
      }
    ],
    message: {
      global_merge_vars: [],
      merge_vars: [],
      from_email: 'noreply@underplan.io',
      to: emails
    }
  });
};