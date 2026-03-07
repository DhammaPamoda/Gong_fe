import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SystemSettings {
    runSecurityCheck: boolean;
    alertLocation: string;
    pollingInterval: number;
}

@Injectable({
    providedIn: 'root'
})
export class SystemSettingsService {
    private apiUrl = '/api/systemSettings';

    constructor(private http: HttpClient) { }

    getSettings(): Observable<SystemSettings> {
        return this.http.get<SystemSettings>(this.apiUrl);
    }

    saveSettings(settings: SystemSettings): Observable<SystemSettings> {
        return this.http.post<SystemSettings>(this.apiUrl, settings);
    }
}
