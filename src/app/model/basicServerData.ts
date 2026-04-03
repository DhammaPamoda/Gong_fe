export class BasicServerData {
  currentServerTime: Date;
  nextScheduledJobTime: Date | null;
  staticDataLastUpdateTime: Date;
  isManual: boolean = false;
  optionalAreas: number[] = [];
  runSecurityCheck: boolean = false;
}
