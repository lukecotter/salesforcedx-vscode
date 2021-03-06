/*
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AuthInfo, Connection } from '@salesforce/core';
import { fail } from 'assert';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { createSandbox, SinonStub } from 'sinon';
import {
  ERROR_EVENT,
  EXIT_EVENT,
  FAILURE_CODE,
  STDERR_EVENT,
  STDOUT_EVENT,
  SUCCESS_CODE
} from '../../src/constants';
import { SObjectDescribe } from '../../src/describe';
import {
  FauxClassGenerator,
  SObjectRefreshResult
} from '../../src/generator/fauxClassGenerator';
import { SObjectDefinition } from '../../src/generator/types';
import { nls } from '../../src/messages';
import { SObjectCategory, SObjectRefreshSource } from '../../src/types';
import { CancellationTokenSource } from './integrationTestUtil';
import { mockDescribeResponse } from './mockData';

const PROJECT_NAME = `project_${new Date().getTime()}`;
const CONNECTION_DATA = {
  accessToken: '00Dxx000thisIsATestToken',
  instanceUrl: 'https://na1.salesforce.com'
};

const env = createSandbox();

// tslint:disable:no-unused-expression
describe('Generate faux classes for SObjects', () => {
  let cancellationTokenSource: CancellationTokenSource;
  let projectPath: string;
  let emitter: EventEmitter;

  function getGenerator(): FauxClassGenerator {
    return new FauxClassGenerator(emitter, cancellationTokenSource.token);
  }

  before(async () => {
    projectPath = path.join(process.cwd(), PROJECT_NAME);
    emitter = new EventEmitter();
  });

  beforeEach(() => {
    cancellationTokenSource = new CancellationTokenSource();
    env.stub(AuthInfo, 'create').returns({
      getConnectionOptions: () => CONNECTION_DATA
    });
  });

  afterEach(() => env.restore());

  it('Should emit an error event on failure', async () => {
    let errorMessage = '';
    let exitCode: number = SUCCESS_CODE;
    let rejectOutput: any;
    const generator = getGenerator();
    emitter.addListener(ERROR_EVENT, (data: Error) => {
      errorMessage = data.message;
    });
    emitter.addListener(EXIT_EVENT, (data: number) => {
      exitCode = data;
    });

    try {
      await generator.generate(
        projectPath,
        SObjectCategory.CUSTOM,
        SObjectRefreshSource.Manual
      );
    } catch ({ error }) {
      rejectOutput = error;
    }
    expect(rejectOutput.message).to.contain(
      nls.localize('no_generate_if_not_in_project', '')
    );
    expect(errorMessage).to.contain(
      nls.localize('no_generate_if_not_in_project', '')
    );
    expect(exitCode).to.equal(FAILURE_CODE);
  });

  it('Should emit an error event on failure, generateMin', async () => {
    let errorMessage = '';
    let stderrInfo = '';
    let exitCode: number = SUCCESS_CODE;
    let rejectOutput: any;
    const generator = getGenerator();
    emitter.addListener(ERROR_EVENT, (data: Error) => {
      errorMessage = data.message;
    });
    emitter.addListener(EXIT_EVENT, (data: number) => {
      exitCode = data;
    });
    emitter.addListener(STDERR_EVENT, (data: string) => {
      stderrInfo = data;
    });

    try {
      await generator.generateMin(projectPath, SObjectRefreshSource.StartupMin);
    } catch ({ error }) {
      rejectOutput = error;
    }
    expect(rejectOutput.message).to.contain(
      nls.localize('no_generate_if_not_in_project', '')
    );
    expect(errorMessage).to.contain(
      nls.localize('no_generate_if_not_in_project', '')
    );
    expect(exitCode).to.equal(FAILURE_CODE);
    expect(stderrInfo).to.contain(
      nls.localize('no_generate_if_not_in_project', '')
    );
  });

  it('Should fail if outside a DX project', async () => {
    let result: SObjectRefreshResult;
    const generator = getGenerator();

    try {
      result = await generator.generate(
        projectPath,
        SObjectCategory.CUSTOM,
        SObjectRefreshSource.Manual
      );
      fail('generator should have thrown an error');
    } catch ({ error }) {
      expect(error.message).to.contain(
        nls.localize('no_generate_if_not_in_project', '')
      );
      return;
    }
  });

  it('Should fail if calling generateMin outside a DX project', async () => {
    let result: SObjectRefreshResult;
    const generator = getGenerator();

    try {
      result = await generator.generateMin(
        projectPath,
        SObjectRefreshSource.StartupMin
      );
      fail('generator should have thrown an error');
    } catch ({ error }) {
      expect(error.message).to.contain(
        nls.localize('no_generate_if_not_in_project', '')
      );
      return;
    }
  });

  it('Should emit message to stderr on failure', async () => {
    let stderrInfo = '';
    let rejectOutput: any;
    const generator = getGenerator();
    emitter.addListener(STDERR_EVENT, (data: string) => {
      stderrInfo = data;
    });

    try {
      await generator.generate(
        projectPath,
        SObjectCategory.CUSTOM,
        SObjectRefreshSource.Manual
      );
    } catch ({ error }) {
      rejectOutput = error;
    }
    expect(rejectOutput.message).to.contain(
      nls.localize('no_generate_if_not_in_project', '')
    );
    expect(stderrInfo).to.contain(
      nls.localize('no_generate_if_not_in_project', '')
    );
  });

  describe('Check results', () => {
    beforeEach(() => {
      env.stub(fs, 'existsSync').returns(true);
      env.stub(fs, 'unlinkSync');
      env.stub(fs, 'writeFileSync');
      env.stub(Connection.prototype, 'request').resolves(mockDescribeResponse);
      env.stub(FauxClassGenerator.prototype, 'generateFauxClass');
      env
        .stub(SObjectDescribe.prototype, 'describeGlobal')
        .returns(['ApexPageInfo']);
    });

    it('Should emit an exit event with code success code 0 on success', async () => {
      let exitCode = FAILURE_CODE;

      const generator = getGenerator();
      emitter.addListener(EXIT_EVENT, (data: number) => {
        exitCode = data;
      });

      const result = await generator.generate(
        projectPath,
        SObjectCategory.CUSTOM,
        SObjectRefreshSource.Manual
      );
      expect(result.error).to.be.undefined;
      expect(exitCode).to.equal(SUCCESS_CODE);
    });

    it('Should log the number of created faux classes on success', async () => {
      const generator = getGenerator();
      let stdoutInfo = '';
      let result: SObjectRefreshResult;
      emitter.addListener(STDOUT_EVENT, (data: string) => {
        stdoutInfo = data;
      });

      result = await generator.generate(
        projectPath,
        SObjectCategory.CUSTOM,
        SObjectRefreshSource.Manual
      );

      expect(result.error).to.be.undefined;
      expect(result.data.standardObjects).to.eql(1);
      expect(stdoutInfo).to.contain(
        nls.localize('fetched_sobjects_length_text', 1, 'Standard')
      );
    });
  });

  describe('Check generateMin results', () => {
    beforeEach(() => {
      const sObjectDefinition1: SObjectDefinition = ('{"name":"Account","fields":[{"type":"Id","name":"Id"}]}' as unknown) as SObjectDefinition;
      const sObjectDefinition2: SObjectDefinition = ('{"name":"Contact","fields":[{"type":"Id","name":"Id"}]}' as unknown) as SObjectDefinition;
      env.stub(fs, 'existsSync').returns(true);
      env.stub(FauxClassGenerator.prototype, 'generateFauxClassText');
      env.stub(FauxClassGenerator.prototype, 'generateAndWriteFauxClasses');
      env
        .stub(FauxClassGenerator.prototype, 'getSObjectSubsetDefinitions')
        .returns([sObjectDefinition1, sObjectDefinition2]);
    });

    it('Should log the number of created faux classes on generateMin success', async () => {
      const generator = getGenerator();
      let stdoutInfo = '';
      let result: SObjectRefreshResult;
      emitter.addListener(STDOUT_EVENT, (data: string) => {
        stdoutInfo = data;
      });
      let exitCode = FAILURE_CODE;
      emitter.addListener(EXIT_EVENT, (data: number) => {
        exitCode = data;
      });

      result = await generator.generateMin(
        projectPath,
        SObjectRefreshSource.StartupMin
      );

      expect(result.error).to.be.undefined;
      expect(result.data.customObjects).to.undefined;
      expect(result.data.standardObjects).to.eql(2);
      expect(stdoutInfo).to.contain(
        nls.localize('fetched_sobjects_length_text', 2, 'Standard')
      );
      expect(exitCode).to.equal(SUCCESS_CODE);
    });
  });

  describe('Cancellable usecases in generateMin', () => {
    let generateAndWriteFauxClassesSpy: SinonStub;
    let refreshCancelledSpy: SinonStub;

    beforeEach(() => {
      generateAndWriteFauxClassesSpy = env.stub(FauxClassGenerator.prototype, 'generateAndWriteFauxClasses');
      refreshCancelledSpy = env.stub(FauxClassGenerator.prototype, 'isRefreshCancelled');
    });

    afterEach(() => {
      env.restore();
      generateAndWriteFauxClassesSpy.restore();
      refreshCancelledSpy.restore();
    });

    it('generateMin should be cancellable before generating classes', async () => {
      env.stub(fs, 'existsSync').returns(true);
      refreshCancelledSpy.onCall(0).returns(true);

      const generator = getGenerator();

      const result = await generator.generateMin(
        projectPath,
        SObjectRefreshSource.StartupMin
      );
      expect(result.data.cancelled).to.be.true;
      expect(generateAndWriteFauxClassesSpy.notCalled).to.be.true;
    });

    it('generateMin should be cancellable after generating typescripts', async () => {
      env.stub(fs, 'existsSync').returns(true);
      refreshCancelledSpy.onCall(0).returns(false);
      refreshCancelledSpy.onCall(1).returns(true);

      const generator = getGenerator();

      const result = await generator.generateMin(
        projectPath,
        SObjectRefreshSource.StartupMin
      );
      expect(result.data.cancelled).to.be.true;
      expect(generateAndWriteFauxClassesSpy.calledOnce).to.be.true;
    });
  });

  describe('Cancellable usecases in generate', () => {
    let describeGlobalSpy: SinonStub;
    let fetchSObjectsSpy: SinonStub;
    let refreshCancelledSpy: SinonStub;
    let generateFauxClassSpy: SinonStub;

    beforeEach(() => {
      describeGlobalSpy = env.stub(SObjectDescribe.prototype, 'describeGlobal');
      fetchSObjectsSpy = env.stub(SObjectDescribe.prototype, 'fetchObjects');
      refreshCancelledSpy = env.stub(FauxClassGenerator.prototype, 'isRefreshCancelled');
      generateFauxClassSpy = env.stub(FauxClassGenerator.prototype, 'generateFauxClasses');
    });

    afterEach(() => {
      env.restore();
      describeGlobalSpy.restore();
      fetchSObjectsSpy.restore();
      refreshCancelledSpy.restore();
      generateFauxClassSpy.restore();
    });

    it('generate should be cancellable before the describe call', async () => {
      env.stub(fs, 'existsSync').returns(true);
      refreshCancelledSpy.onCall(0).returns(true);

      const generator = getGenerator();

      const result = await generator.generate(
        projectPath,
        SObjectCategory.ALL,
        SObjectRefreshSource.Startup
      );
      expect(result.data.cancelled).to.be.true;
      expect(describeGlobalSpy.notCalled).to.be.true;
    });

    it('generate should be cancellable after the describe call', async () => {
      env.stub(fs, 'existsSync').returns(true);
      refreshCancelledSpy.onCall(0).returns(false);
      refreshCancelledSpy.onCall(1).returns(true);

      const generator = getGenerator();

      const result = await generator.generate(
        projectPath,
        SObjectCategory.ALL,
        SObjectRefreshSource.Startup
      );
      expect(result.data.cancelled).to.be.true;
      expect(describeGlobalSpy.calledOnce).to.be.true;
      expect(fetchSObjectsSpy.notCalled).to.be.true;
    });

    it('generate should be cancellable after fetching SObjects', async () => {
      env.stub(fs, 'existsSync').returns(true);
      fetchSObjectsSpy.returns([]);
      refreshCancelledSpy.onCall(0).returns(false);
      refreshCancelledSpy.onCall(1).returns(false);
      refreshCancelledSpy.onCall(2).returns(true);

      const generator = getGenerator();

      const result = await generator.generate(
        projectPath,
        SObjectCategory.ALL,
        SObjectRefreshSource.Startup
      );
      expect(result.data.cancelled).to.be.true;
      expect(describeGlobalSpy.calledOnce).to.be.true;
      expect(fetchSObjectsSpy.calledOnce).to.be.true;
      expect(generateFauxClassSpy.notCalled).to.be.true;
    });

    it('generate should be cancellable after generating faux classes', async () => {
      env.stub(fs, 'existsSync').returns(true);
      fetchSObjectsSpy.returns([]);
      refreshCancelledSpy.onCall(0).returns(false);
      refreshCancelledSpy.onCall(1).returns(false);
      refreshCancelledSpy.onCall(2).returns(false);
      refreshCancelledSpy.onCall(3).returns(true);

      const generator = getGenerator();

      const result = await generator.generate(
        projectPath,
        SObjectCategory.CUSTOM,
        SObjectRefreshSource.Startup
      );
      expect(result.data.cancelled).to.be.true;
      expect(generateFauxClassSpy.calledTwice).to.be.true;
    });
  });
});
