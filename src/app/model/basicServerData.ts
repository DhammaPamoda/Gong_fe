export class BasicServerData {
  currentServerTime: Date;
  nextScheduledJobTime: Date | null;
  staticDataLastUpdateTime: Date;
  isManual: boolean = false;
  areas: { [key: string]: string } = {};
  runSecurityCheck: boolean = false;
}
