App.Utils.sendMail = function (templateName, bcc, subject, htmlText) {
  // This uses the API interface for Mandrill
  emails = _.forEach(bcc, function (email) {
    Meteor.Mandrill.sendTemplate({
      key: process.env.MANDRILL_API_KEY,
      templateSlug: templateName,
      templateContent: [
        {
          name: 'body',
          content: htmlText
        }
      ],
      globalMergeVars: [],
      mergeVars: [],
      toEmail: email
    });
  });
};