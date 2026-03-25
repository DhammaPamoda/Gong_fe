import { Component } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';

import { first, takeUntil } from 'rxjs/operators';
import { NgRedux } from '@angular-redux/store';
import Swal from 'sweetalert2';

import { User } from '../../../model/user';
import { StoreService } from '../../../services/store.service';
import { DateFormat } from '../../../model/dateFormat';
import { BaseComponent } from '../../../shared/baseComponent';
import { StoreDataTypeEnum } from '../../../store/storeDataTypeEnum';
import { EditUserActionEnum, EditUserDialogComponent } from '../../../dialogs/edit-user-dialog/edit-user-dialog.component';
import { AuthService } from '../../../services/auth.service';
import { IObjectMap } from '../../../model/store-model';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent extends BaseComponent {
  selectedUser: User;
  usersDisplayedColumns = ['user_id', 'role', 'creation_date', 'update_date'];
  usersDataSource: MatTableDataSource<User>;
  usersData: User[] = [];

  dateFormat: DateFormat;
  areEditButtonsEnabled: boolean = false;
  currentUser: string;
  currentRole: string;


  constructor(private ngRedux: NgRedux<any>,
    private authService: AuthService,
    private dialog: MatDialog,
    private storeService: StoreService) {
    super();
    this.currentUser = this.authService.getUser();
    this.currentRole = this.authService.getRole();
  }

  protected listenForUpdates() {
    this.storeService.getUsersArray();

    this.ngRedux.select<User[]>([StoreDataTypeEnum.STATIC_DATA, 'users'])
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((usersArray: User[]) => {
        this.usersData = usersArray;
        this.usersDataSource = new MatTableDataSource<User>(this.usersData);
      });

    this.storeService.getDateFormat()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(dateFormat => this.dateFormat = dateFormat.convertToDateFormatter());

  }



  addUser() {
    const rolesArray = this.storeService.getRolesArray();
    const existingUsersIds = this.storeService.getExistingUsersIdsArray();
    const dialogRef = this.dialog.open(EditUserDialogComponent, {
      height: '60vh',
      width: '70vw',
      panelClass: 'user-edit-dialog',
      position: { top: '15vh' },
      data: { user: new User(), action: EditUserActionEnum.NEW, rolesArray, existingUsersIds }
    });

    dialogRef.afterClosed().pipe(first())
      .subscribe((aUser: User) => {
        if (aUser) {
          this.storeService.addUser(aUser);
        }
      });

  }

  updateUser(aAction: EditUserActionEnum = EditUserActionEnum.UPDATE) {
    const rolesArray = this.storeService.getRolesArray();
    const dialogRef = this.dialog.open(EditUserDialogComponent, {
      height: '60vh',
      width: '70vw',
      panelClass: 'user-edit-dialog',
      position: { top: '15vh' },
      data: { user: this.selectedUser, action: aAction, rolesArray }
    });

    dialogRef.afterClosed().pipe(first())
      .subscribe((aUser: User) => {
        if (aUser && aAction === EditUserActionEnum.UPDATE) {
          this.storeService.updateUser(aUser);
        } else if (aUser && aAction === EditUserActionEnum.PASSWORD) {
          this.storeService.resetUserPassword(aUser);
        }
      });
  }

  deleteUser() {
    Swal.fire({
      title: this.titles.config.users.alerts.confirmRemoveUser.title,
      html: `${this.titles.config.users.alerts.confirmRemoveUser.text} <BR> ${this.selectedUser.id}`,
      icon: 'warning',
      confirmButtonText: this.titles.config.users.alerts.confirmRemoveUser.buttons.confirm,
      showCancelButton: true,
      cancelButtonText: this.titles.config.users.alerts.confirmRemoveUser.buttons.cancel,
    })
      .then(result => {
        if (result.value) {
          this.storeService.deleteUser(this.selectedUser);
        }
      });
  }

  changeUserPass() {
    this.updateUser(EditUserActionEnum.PASSWORD);
  }

  selectUser(aUser: User) {
    this.selectedUser = aUser;

    this.areEditButtonsEnabled = this.selectedUser &&
      (('dev' === this.currentUser) ||
        ('admin' === this.currentRole && !['dev', 'admin'].includes(this.selectedUser.id))
      );
  }
}
