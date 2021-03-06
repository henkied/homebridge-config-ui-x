import { Component, OnInit } from '@angular/core';
import { TimerObservable } from 'rxjs/observable/TimerObservable';
import { StateService } from '@uirouter/angular';
import { ToastsManager } from 'ng2-toastr/ng2-toastr';

import { ApiService } from '../../_services/api.service';
import { WsService } from '../../_services/ws.service';

@Component({
  selector: 'app-restart-container',
  templateUrl: './restart-container.component.html'
})
export class RestartContainerComponent implements OnInit {
  onOpen;
  onMessage;
  checkTimeout;
  checkDelay;
  resp: any = {};
  timeout = false;
  error: any = false;

  constructor(
    private $api: ApiService,
    private ws: WsService,
    public toastr: ToastsManager,
    private $state: StateService,
  ) { }

  ngOnInit() {
    // subscribe to status events
    if (this.ws.socket.readyState) {
      this.ws.subscribe('status');
    }

    this.onOpen = this.ws.open.subscribe(() => {
      this.ws.subscribe('status');
    });

    this.$api.dockerRestartContainer().subscribe(
      data => {
        this.resp = data;
        this.checkIfServerUp();
      },
      err => {
        this.error = 'An error occured sending the restart command to the server.';
        this.toastr.error(`An error occured sending the restart command to the server: ${err.message}`, 'Error');
      }
    );
  }

  checkIfServerUp() {
    this.checkDelay = TimerObservable.create(10000).subscribe(() => {
      this.onMessage = this.ws.message.subscribe((data) => {
        try {
          data = JSON.parse(data.data);

          if (data.server && data.server.status === 'up') {
            this.toastr.success('Docker Container Restarted', 'Success');
            this.$state.go('status');
          }

        } catch (e) { }
      });
    });

    this.checkTimeout = TimerObservable.create(60000).subscribe(() => {
      this.toastr.warning('The server is taking a long time to come back online', 'Warning', {
        toastLife: 10000
      });
      this.timeout = true;
    });
  }

  // tslint:disable-next-line:use-life-cycle-interface
  ngOnDestroy() {
    if (this.onOpen) {
      this.onOpen.unsubscribe();
    }

    if (this.onMessage) {
      this.onMessage.unsubscribe();
    }

    if (this.checkDelay) {
      this.checkDelay.unsubscribe();
    }

    if (this.checkTimeout) {
      this.checkTimeout.unsubscribe();
    }
  }

}

export const RestartContainerState = {
  name: 'docker-restart-container',
  url: '/docker/restart',
  component: RestartContainerComponent,
  data: {
    requiresAuth: true,
    requiresAdmin: true
  }
};
