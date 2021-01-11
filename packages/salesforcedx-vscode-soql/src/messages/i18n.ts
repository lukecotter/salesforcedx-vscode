/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Conventions:
 * _message: is for unformatted text that will be shown as-is to
 * the user.
 * _text: is for text that will appear in the UI, possibly with
 * decorations, e.g., $(x) uses the https://octicons.github.com/ and should not
 * be localized
 *
 * If ommitted, we will assume _message.
 */
export const messages = {
  soql_channel_name: 'SOQL Extension',
  progress_running_query: 'Running query',
  soql_query_results: 'SOQL Query Results',
  info_no_default_org:
    'INFO: No default org found. Set a default org to use SOQL Builder. Run "SFDX: Create a Default Scratch Org" or "SFDX: Authorize an Org" to set one.',
  info_syntax_unsupported:
    'INFO: This syntax is not yet supported in SOQL Builder. Instead, use a text editor.',
  info_file_save_success: 'We saved the results in the %s folder as: %s',
  error_sobject_metadata_request:
    'ERROR: We can’t retrieve the fields for %s. Make sure that you’re connected to an authorized org and have permissions to view the object and fields.',
  error_sobjects_request:
    'ERROR: We can’t retrieve the objects in the org. Make sure that you’re connected to an authorized org and have permissions to view the objects in the org.',
  error_run_soql_query: 'ERROR: We can’t run the SOQL query. %s',
  error_unknown_error:
    'ERROR: %s. Unknown error. Open an issue and provide the error message details: https://github.com/forcedotcom/soql-tooling/issues/new/choose.',
  error_data_view_save:
    'ERROR: We can’t save the file to the %s directory. Make sure you have write permissions for the directory.'
};