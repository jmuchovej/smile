export abstract class ExperimentService {}

export class Prolific implements ExperimentService {
  private code: string;
  private urlTemplate: string;

  constructor(code: string) {
    this.code = code;
    this.urlTemplate = "https://app.prolific.com/submissions/complete?cc=";
  }
}

export class MechanicalTurk implements ExperimentService {
  private code: string;
  private urlTemplate: string;

  constructor(code: string) {
    this.code = code;
    this.urlTemplate = "https://www.mturk.com/mturk/externalSubmit";
  }
}

export const MTurk = MechanicalTurk;

export class SONA implements ExperimentService {
  private code: string;
  private urlTemplate: string;

  constructor(code: string, urlTemplate: string) {
    this.code = code;
    this.urlTemplate = urlTemplate;
  }
}

export class CitizenScience implements ExperimentService {}

export class AnonymousSubmission implements ExperimentService {}
