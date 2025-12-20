import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class MessageBusService {
  private subjects = new Map<number, Subject<any>>();

  private getSubject(convId: number) {
    let s = this.subjects.get(convId);
    if (!s) {
      s = new Subject<any>();
      this.subjects.set(convId, s);
    }
    return s;
  }

  publish(convId: number, payload: any) {
    this.getSubject(convId).next(payload);
  }

  stream(convId: number) {
    return this.getSubject(convId).asObservable();
  }
}