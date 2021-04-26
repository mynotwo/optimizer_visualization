import json
from flask import Flask, request
import torch
import torch.nn as nn
import time

import numpy as np
import math

class Model(nn.Module):
    def __init__(self, obj, init_point=False):
        super(Model, self).__init__()

        init_point = [float(i) for i in init_point]
        coor = torch.from_numpy(np.array(init_point)).type(torch.FloatTensor)

        self.co = nn.Parameter(coor)

        self.register_parameter('coordinate', self.co)

        self.obj = obj

    def forward(self):

        x = self.co[0]
        y = self.co[1]

        if self.obj == 'matyas':
            f = 0.26 * (x * x + y * y) + 0.48 * x * y
            return f

        if self.obj == 'flower':
            f = (x * x) + (y * y) + x * torch.sin(y) + y * torch.sin(x)
            return f

        if self.obj == 'banana':
            f = torch.pow(1 - x, 2) + 100 * torch.pow(y - x * x, 2)
            return f

        if self.obj == 'himmelblau':
            f = torch.pow(x * x - 11, 2) + torch.pow(x + y * y - 7, 2)
            return f

        def get_objective(s):
            return lambda x, y: eval(s)

        evals = get_objective(self.obj)
        f = evals(x, y)

        return f


class Learner(object):
    def __init__(self, obj, initialization):
        self.coordinates = []
        self.model = Model(obj, initialization)
        self.lam = 1e-5
        self.ini = [float(x) for x in initialization]
        self.end_epoch = 0

    def learn(self, opt='lbfgs', epochs=10000, lam=1e-3, rate=1e-1):

        print opt

        if opt == 'lbfgs':

            def fun_closure():
                loss = self.model.forward()
                optimizer.zero_grad()
                loss.backward()
                cpu_time = time.clock()

                self.model.co.data.numpy()
                self.coordinates.append(self.model.co.data.numpy().tolist())
                self.time.append(cpu_time)
                return loss

            optimizer = torch.optim.LBFGS(
                self.model.parameters(),
                lr=rate)
            for epoch in range(epochs):
                optimizer.step(fun_closure)

                if np.abs(np.sum(self.model.co.data.numpy() - self.coordinates[-1])) < 1e-5:
                    print epoch
                    self.end_epoch = epoch
                    break

        else:
            # set optimizer
            if opt == 'GD':
                optimizer = torch.optim.SGD(
                    self.model.parameters(),
                    lr=rate)

            if opt == 'adam':
                optimizer = torch.optim.Adam(
                    self.model.parameters(),
                    lr=rate)

            if opt == 'adagrad':
                optimizer = torch.optim.Adagrad(
                    self.model.parameters(),
                    lr=rate)

            if opt == 'adadelta':
                optimizer = torch.optim.Adadelta(
                    self.model.parameters(),
                    lr=rate)

            if opt == 'rmsprop':
                optimizer = torch.optim.RMSprop(
                    self.model.parameters(),
                    lr=rate)

            if opt == 'GDM':
                optimizer = torch.optim.SGD(
                    self.model.parameters(),
                    lr=rate, momentum=lam)

            if opt == 'rmspropM':
                optimizer = torch.optim.RMSprop(
                    self.model.parameters(),
                    lr=rate, momentum=lam)

            self.coordinates.append(self.ini)
            for epoch in range(epochs):
                loss = self.model.forward()
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                cpu_time = time.clock()

                if np.sum(np.abs(self.model.co.data.numpy() - self.coordinates[-1])) < 1e-5:
                    print epoch
                    self.end_epoch = epoch
                    break

                self.coordinates.append(self.model.co.data.numpy().tolist())
                self.time.append(cpu_time)

            self.end_epoch = epoch


            print len(self.coordinates)


# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='')


@app.route('/')
def homepage():
    return app.send_static_file('index.html')


def scale_values(width, height, x1, x2, y1, y2, f):

    x1 = int(x1)
    x2 = int(x2)
    y1 = int(y1)
    y2 = int(y2)

    xscale = (x2 - x1)*1.0 / width
    yscale = (y2 - y1)*1.0 / height

    arr = []
    for y in np.arange(y1, y2, yscale):
        for x in np.arange(x1, x2, xscale):
            value = f(x, y)
            arr.append(value)

    return arr


def matyas(x, y):
    return 0.26 * (x * x + y * y) + 0.48 * x * y

def himmelblau(x, y):
    return math.pow(x * x - 11, 2) + math.pow(x + y * y - 7, 2)

def flower(x, y):
    return x * x + y * y + x * math.sin(y) + y * math.sin(x)

def getObjective(s):
    return lambda x, y: eval(s)

def banana(x, y):
    return math.pow(1 - x, 2) + 100 * math.pow(y - x * x, 2)


# Soliciting effective training examples from bootstrap
@app.route('/training', methods=['POST'])
def training():
    data = json.loads(request.data)
    learning_rates = data["rate"]
    optimizers = data["opt"]
    objective = data["obj"]
    momentum_rates = data["reg"]
    width = data["width"]
    height = data["height"]
    customize = data["customize"]
    pos = data['pos']
    [x1, x2] = data["X"]
    [y1, y2] = data["Y"]

    if customize:
        f = getObjective(objective)
    else:
        if objective == 'flower':
            f = flower
        elif objective == 'banana':
            f = banana
        elif objective == 'himmelblau':
            f = himmelblau
        else:
            f = matyas

    values = scale_values(width, height, x1, x2, y1, y2, f)
    res = {}
    res["values"] = values

    for opt in optimizers:
        for rate in learning_rates:
            for reg in momentum_rates:
                learner = Learner(objective, pos)
                learner.learn(opt=opt, lam=float(reg), rate=float(rate))
                if 'M' in opt:
                    key = opt + ' lr:' + rate + '\nm:' + reg + ' \niter:' + str(learner.end_epoch)
                else:
                    key = opt + ' lr:' + rate + ' \niter:' + str(learner.end_epoch)

                res[key] = learner.coordinates


    return json.dumps({'res': res}), 200, {'ContentType': 'application/json'}


app.run(debug=True)
