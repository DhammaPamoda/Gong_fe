import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SystemSettingsService, SystemSettings } from '../../../services/system-settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { timer, Subscription } from 'rxjs';
import { StoreService } from '../../../services/store.service';

@Component({
    selector: 'app-system-settings',
    templateUrl: './system-settings.component.html',
    styleUrls: ['./system-settings.component.scss']
})
export class SystemSettingsComponent implements OnInit {
    settingsForm: FormGroup;
    isLoading = true;
    isTestActive: boolean = false;
    isGongCurrentlyPlaying: boolean = false;
    private gongPlayingCheckSubscription: Subscription;


    constructor(
        private fb: FormBuilder,
        private systemSettingsService: SystemSettingsService,
        private snackBar: MatSnackBar,
        private storeService: StoreService,
        private cdr: ChangeDetectorRef
    ) {
        this.settingsForm = this.fb.group({
            runSecurityCheck: [false],
            testing: [false],
            alertLocation: ['', Validators.required],
            pollingInterval: [10, [Validators.required, Validators.min(1)]],
            overrideOrefUrl: [false],
            orefUrl: ['']
        });

        this.settingsForm.get('overrideOrefUrl').valueChanges.subscribe((checked) => {
            const orefUrlControl = this.settingsForm.get('orefUrl');
            if (checked) {
                orefUrlControl.setValidators([Validators.required]);
            } else {
                orefUrlControl.clearValidators();
            }
            orefUrlControl.updateValueAndValidity();
        });
    }

    ngOnInit(): void {
        this.loadSettings();
    }

    ngOnDestroy(): void {
        this.stopPollingGongStatus();
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
                        pollingInterval: settings.pollingInterval || 10,
                        overrideOrefUrl: settings.overrideOrefUrl || false,
                        orefUrl: settings.orefUrl || ''
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

    triggerTestAlert(category: string, label: string) {
        this.systemSettingsService.triggerTestEmergency(category).subscribe(
            () => {
                this.snackBar.open(`Test Alert (${label}) triggered!`, 'Close', { duration: 3000 });
                this.isTestActive = true;
                this.cdr.detectChanges();
                this.startPollingGongStatus();
            },
            (error) => {
                this.snackBar.open(`Error triggering test alert (${label})`, 'Close', { duration: 3000 });
            }
        );
    }

    private startPollingGongStatus() {
        this.stopPollingGongStatus();
        this.gongPlayingCheckSubscription = timer(0, 1000).subscribe(() => {
            this.storeService.isGongPlaying().subscribe({
                next: (result: any) => {
                    const wasPlaying = this.isGongCurrentlyPlaying;
                    this.isGongCurrentlyPlaying = result.data && result.data.isPlaying;

                    if (wasPlaying !== this.isGongCurrentlyPlaying) {
                        if (!this.isGongCurrentlyPlaying) {
                            this.isTestActive = false;
                            this.cdr.detectChanges();
                            this.stopPollingGongStatus();
                        } else {
                            this.isTestActive = true;
                            this.cdr.detectChanges();
                        }
                    }
                },
                error: (error) => console.error('Error checking gong status:', error)
            });
        });
    }

    private stopPollingGongStatus() {
        if (this.gongPlayingCheckSubscription) {
            this.gongPlayingCheckSubscription.unsubscribe();
            this.gongPlayingCheckSubscription = undefined;
        }
    }

    cancelTestSound() {
        this.stopPollingGongStatus();
        this.storeService.cancelGong().subscribe(
            (result: any) => {
                const message = (result.data && result.data.gongCanceled) ? 'Test sound canceled successfully' : 'Gong canceled successfully';
                this.snackBar.open(message, 'Close', { duration: 3000 });
                setTimeout(() => {
                    this.isGongCurrentlyPlaying = false;
                    this.isTestActive = false;
                    this.cdr.detectChanges();
                }, 500);
            },
            (error) => {
                this.snackBar.open('Failed to cancel test sound', 'Close', { duration: 3000 });
                setTimeout(() => {
                    this.isTestActive = false;
                    this.cdr.detectChanges();
                }, 500);
            }
        );
    }
}
