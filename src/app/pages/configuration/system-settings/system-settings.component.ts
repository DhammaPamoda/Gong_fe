import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SystemSettingsService, SystemSettings } from '../../../services/system-settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-system-settings',
    templateUrl: './system-settings.component.html',
    styleUrls: ['./system-settings.component.scss']
})
export class SystemSettingsComponent implements OnInit {
    settingsForm: FormGroup;
    isLoading = true;

    constructor(
        private fb: FormBuilder,
        private systemSettingsService: SystemSettingsService,
        private snackBar: MatSnackBar
    ) {
        this.settingsForm = this.fb.group({
            runSecurityCheck: [false],
            testing: [false],
            alertLocation: ['', Validators.required],
            pollingInterval: [10, [Validators.required, Validators.min(1)]]
        });
    }

    ngOnInit(): void {
        this.loadSettings();
    }

    loadSettings() {
        this.isLoading = true;
        this.systemSettingsService.getSettings().subscribe(
            (settings: SystemSettings) => {
                if (settings) {
                    this.settingsForm.patchValue({
                        runSecurityCheck: settings.runSecurityCheck || false,
                        testing: settings.testing || false,
                        alertLocation: settings.alertLocation || 'דגניה',
                        pollingInterval: settings.pollingInterval || 10
                    });
                }
                this.isLoading = false;
            },
            (error) => {
                console.error('Error loading system settings', error);
                this.snackBar.open('Error loading settings', 'Close', { duration: 3000 });
                this.isLoading = false;
            }
        );
    }

    saveSettings() {
        if (this.settingsForm.valid) {
            this.isLoading = true;
            this.systemSettingsService.saveSettings(this.settingsForm.value).subscribe(
                (updatedSettings) => {
                    this.snackBar.open('Settings saved successfully', 'Close', { duration: 3000 });
                    this.isLoading = false;
                },
                (error) => {
                    console.error('Error saving system settings', error);
                    this.snackBar.open('Error saving settings', 'Close', { duration: 3000 });
                    this.isLoading = false;
                }
            );
        }
    }
}
