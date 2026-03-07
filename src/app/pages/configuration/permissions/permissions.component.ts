import { Component } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

import { takeUntil } from 'rxjs/operators';
import { NgRedux } from '@angular-redux/store';
import * as _ from 'lodash';

import { Permission } from '../../../model/permission';
import { BaseComponent } from '../../../shared/baseComponent';
import { StoreDataTypeEnum } from '../../../store/storeDataTypeEnum';
import { StoreService } from '../../../services/store.service';

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss']
})
export class PermissionsComponent extends BaseComponent {

  permissionsDisplayedColumns = ['action', 'user', 'super-user', 'admin', 'all'];
  permissionsDataSource: MatTableDataSource<Permission>;
  permissionsData: Permission[] = [];
  originalPermissionsData: Permission[] = [];
  wasChanged: boolean;

  constructor(private ngRedux: NgRedux<any>,
    private storeService: StoreService) {
    super();
  }

  protected listenForUpdates() {
    this.ngRedux.select<Permission[]>([StoreDataTypeEnum.STATIC_DATA, 'permissions'])
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((permissionsArray: Permission[]) => {
        this.wasChanged = false;
        permissionsArray.forEach(permission => permission.computeBooleans());
        this.permissionsData = _.sortBy(permissionsArray, 'order');
        this.originalPermissionsData = _.cloneDeep(this.permissionsData);
        this.permissionsDataSource = new MatTableDataSource<Permission>(this.permissionsData);
      });
  }

  save() {
    this.permissionsData.forEach((permission) => permission.computeRoles());
    this.storeService.updatePermissions(this.permissionsData);
  }

  roleChanged(aPermission: Permission, aIsAll = false) {
    if (aIsAll) {
      aPermission.isDw = aPermission.isTeacher = aPermission.isAdmin = aPermission.isAll;
    } else {
      aPermission.isAll = (aPermission.isDw === true) && (aPermission.isTeacher === true) && (aPermission.isAdmin === true);
    }

    this.wasChanged = this.permissionsData.some((permission, index) => {
      const originalPermission = this.originalPermissionsData[index];
      return (originalPermission.isDw !== permission.isDw) || (originalPermission.isTeacher !== permission.isTeacher) ||
        (originalPermission.isAdmin !== permission.isAdmin);
    });

  }
}
