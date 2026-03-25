import { Directive, OnDestroy, OnInit } from '@angular/core';

import { Subject } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';

import { NgRedux } from '@angular-redux/store';
import { Titles } from './titles';

import { StoreDataTypeEnum } from '../store/storeDataTypeEnum';
import { AuthService } from '../services/auth.service';

@Directive()
export class BaseComponent implements OnInit, OnDestroy {

  constructor(protected ngReduxObj: NgRedux<any> = null,
    protected authServiceObj: AuthService = null) {
  }

  isLoggedIn = false;
  currentRole: string;

  public titles: typeof Titles = Titles;

  protected onDestroy$ = new Subject<boolean>();

  ngOnInit() {
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
    this.hookOnInit();

  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
    this.onDestroy$.complete();
  }



  protected listenForUpdates() {
  }

  protected hookOnInit() {
  }

  public getIsLoggedIn() {
    return this.isLoggedIn;
  }
}
