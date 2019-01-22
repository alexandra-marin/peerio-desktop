// global UI store
import { observable } from 'mobx';

class RouterStore {
    @observable currentRoute = window.router.getCurrentLocation().pathname;

    constructor() {
        window.router.listen(this.handleRouteChange);
    }

    handleRouteChange = (route: { pathname: string }) => {
        this.currentRoute = route.pathname;
    };

    navigateTo(path: string) {
        if (this.currentRoute === path) return;
        window.router.push(path);
    }

    navigateToAsync(path: string) {
        setTimeout(() => {
            if (this.currentRoute === path) return;
            window.router.push(path);
        });
    }

    get isNewChat() {
        return this.currentRoute === this.ROUTES.newChat;
    }
    get isNewChannel() {
        return this.currentRoute === this.ROUTES.newChannel;
    }
    get isPatientSpace() {
        return this.currentRoute.startsWith('/app/patients');
    }
    get isNewPatient() {
        return this.currentRoute === this.ROUTES.newPatient;
    }
    get isNewPatientRoom() {
        return this.currentRoute === this.ROUTES.newPatientRoom;
    }
    get isNewInternalRoom() {
        return this.currentRoute === this.ROUTES.newInternalRoom;
    }

    get ROUTES() {
        return {
            login: '/',
            signup: '/signup',
            newUser: '/new-user',

            loading: '/app',
            welcome: '/app/welcome',
            chats: '/app/chats',
            newChat: '/app/chats/new-chat',
            newChannel: '/app/chats/new-channel',
            channelInvite: '/app/chats/channel-invite',
            pendingDMDismissed: '/app/chats/pending-dm-dismissed',

            newPatient: '/app/chats/new-patient',
            patients: '/app/patients',
            newInternalRoom: '/app/patients/new-internal-room',
            newPatientRoom: '/app/patients/new-patient-room',

            onboarding: '/app/onboarding',
            files: '/app/files',
            contacts: '/app/contacts',
            invitedContacts: '/app/contacts/invited',
            newContact: '/app/contacts/new-contact',
            newInvite: '/app/contacts/new-invite',
            profile: '/app/settings/profile',
            security: '/app/settings/security',
            prefs: '/app/settings/preferences',
            account: '/app/settings/account',
            about: '/app/settings/about',
            help: '/app/settings/help',
            devSettings: '/app/settings/dev'
        };
    }

    get ROUTES_INVERSE() {
        const obj = {} as { [routePath: string]: string };

        for (const [k, v] of Object.entries(this.ROUTES)) {
            obj[v] = k;
        }

        return obj;
    }
}

export default new RouterStore();
