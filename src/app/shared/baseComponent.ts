import {OnDestroy, OnInit} from '@angular/core';

import {Subject} from 'rxjs';
import {first, takeUntil} from 'rxjs/operators';

import {NgRedux} from '@angular-redux/store';
import {TranslateService} from '@ngx-translate/core';

import {StoreDataTypeEnum} from '../store/storeDataTypeEnum';
import {AuthService} from '../services/auth.service';

export class BaseComponent implements OnInit, OnDestroy {

  constructor(protected translateService: TranslateService = null,
              protected ngReduxObj: NgRedux<any> = null,
              protected authServiceObj: AuthService = null) {
  }

  isLoggedIn = false;
  currentRole: string;

  translationMap = new Map<string, string>();

  protected onDestroy$ = new Subject<boolean>();

  ngOnInit() {
    if (this.translateService) {
      this.translateService.onLangChange.pipe(
        takeUntil(this.onDestroy$))
        .subscribe(() => this.translateNeededText());
    }
    if (this.ngReduxObj && this.authServiceObj) {
      this.ngReduxObj.select<boolean>([StoreDataTypeEnum.INNER_DATA, 'isLoggedIn'])
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((pIsLoggedIn) => {
          this.isLoggedIn = pIsLoggedIn;
          if (!this.isLoggedIn) {
            this.isLoggedIn = this.authServiceObj.loggedIn;
          }
          if (pIsLoggedIn) {
            this.currentRole = this.authServiceObj.getRole();
          } else {
            this.currentRole = '';
          }
        });
    }

    this.listenForUpdates();
    this.translateNeededText().then(() => this.hookOnInit());

  }
  
  ngOnDestroy() {
    this.onDestroy$.next(true);
    this.onDestroy$.complete();
  }



  protected listenForUpdates() {
  }

  protected hookOnInit() {
  }

  protected getKeysArray4Translations(): string[] {
    return [];
  }

  protected getTranslation(aKey: string): string {

    return this.translationMap.get(aKey);
  }

  private translateNeededText(): Promise<void> {
    this.translationMap.clear();
    const keysArray = this.getKeysArray4Translations();
    if (!this.translateService || keysArray.length <= 0) {
      return Promise.resolve();
    }

    return new Promise<void>(resolve => {
      this.translateService.get(keysArray).pipe(first()).subscribe(transResult => {
        keysArray.forEach((key) => this.translationMap.set(key, transResult[key]));
        resolve();
      });
    });
  }

  public getIsLoggedIn() {
    return this.isLoggedIn;
  }
}
