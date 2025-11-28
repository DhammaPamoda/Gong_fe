import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = localStorage.getItem('access_token');
    
    // Don't add token for whitelisted endpoints
    const whitelistedPaths = ['api/relay/isGongPlaying', 'api/relay/cancelGong'];
    const isWhitelisted = whitelistedPaths.some(path => req.url.includes(path));
    
    if (token && !isWhitelisted) {
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(authReq);
    }
    
    return next.handle(req);
  }
}
