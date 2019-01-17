/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// tslint:disable:no-unused-expression

import { expect } from 'chai';
import * as path from 'path';
import * as shell from 'shelljs';
import { workspace } from 'vscode';
import { JAVA_HOME_KEY } from '../../src/requirements';

describe('Java Requirements Test', () => {
  it('The jar should be signed', () => {
    const apexJarPath = path.join(__dirname, '..', '..', 'apex-jorje-lsp.jar');
    expect(
      shell
        .exec(`jarsigner -verify ${apexJarPath}`)
        .stdout.includes('jar verified')
    ).to.be.true;
  });

  it('Should have java.home section', () => {
    const config = workspace.getConfiguration();
    expect(config.has(JAVA_HOME_KEY)).to.be.true;
  });
});
