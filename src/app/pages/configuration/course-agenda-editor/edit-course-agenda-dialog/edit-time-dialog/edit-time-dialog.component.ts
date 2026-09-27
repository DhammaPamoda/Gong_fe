import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import moment from 'moment';

export interface EditTimeDialogData {
    time: string;
}

export interface EditTimeDialogResult {
    action: 'save' | 'delete';
    time?: string;
}

@Component({
    selector: 'app-edit-time-dialog',
    templateUrl: './edit-time-dialog.component.html',
    styleUrls: ['./edit-time-dialog.component.scss']
})
export class EditTimeDialogComponent implements OnInit {
    currentTime: string = '';
    isTimePickerOpen: boolean = false;
    tempPickerTime: Date = new Date();

    constructor(
        public dialogRef: MatDialogRef<EditTimeDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: EditTimeDialogData
    ) {}

    ngOnInit(): void {
        this.currentTime = this.data.time || '00:00';
        const [hours, minutes] = this.currentTime.split(':').map(Number);
        const d = new Date();
        d.setHours(hours || 0, minutes || 0, 0, 0);
        this.tempPickerTime = d;
    }

    openClockPicker(): void {
        this.isTimePickerOpen = true;
    }

    onTimePicked(event: any): void {
        const val = (event && event.value) ? event.value : this.tempPickerTime;
        if (val) {
            this.currentTime = moment(val).format('HH:mm');
        }
    }

    onClockPickerClose(): void {
        this.isTimePickerOpen = false;
        if (this.tempPickerTime) {
            this.currentTime = moment(this.tempPickerTime).format('HH:mm');
        }
    }

    isValidTime(): boolean {
        if (!this.currentTime) {
            return false;
        }
        const trimmed = this.currentTime.trim();
        if (!/^\d{1,2}:\d{2}$/.test(trimmed)) {
            return false;
        }
        const [h, m] = trimmed.split(':').map(Number);
        return h >= 0 && h < 24 && m >= 0 && m < 60;
    }

    save(): void {
        if (!this.isValidTime()) {
            return;
        }
        const parts = this.currentTime.trim().split(':');
        const formatted = `${parts[0].padStart(2, '0')}:${parts[1]}`;
        this.dialogRef.close({ action: 'save', time: formatted });
    }

    delete(): void {
        this.dialogRef.close({ action: 'delete' });
    }

    cancel(): void {
        this.dialogRef.close(null);
    }
}
