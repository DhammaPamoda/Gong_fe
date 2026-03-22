import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Service to manage HK4 hardware device configuration
 */
@Injectable({
    providedIn: 'root'
})
export class Hk4Service {

    constructor(private http: HttpClient) { }

    getSettings(): Observable<any> {
        return this.http.get<any>('/api/hk4');
    }

    saveSettings(settings: any): Observable<any> {
        return this.http.post<any>('/api/hk4', settings);
    }

    setStatus(enabled: boolean): Observable<any> {
        return this.http.post<any>('/api/hk4/status', { enabled });
    }
}
